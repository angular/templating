import {NodeAttrs} from './types';
import {NodeContainer} from './node_container';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {assert} from 'assert';
import {TemplateDirective, ComponentDirective, DecoratorDirective, EXECUTION_CONTEXT} from './annotations';
import {Injector} from 'di/injector';
import {Inject, Provide} from 'di/annotations';
import {ViewPort, View} from './view';
import {TreeArray} from './tree_array';
import {EventHandler} from './event_handler';
import {reduceTree} from './tree_array';
import {NgNode} from './ng_node';

/*
 * A ViewFactory contains a nodes which need to be cloned for each new 
 * instance of a view. It also contains a list of ElementBinders 
 * which need to be bound to the cloned instances of the view. 
 */
export class ViewFactory {  
  /**
   * @param templateContainer nodes of the template. 
   *        All elements in those nodes and their child nodes that should be bound have to have
   *        the css class `ng-directive`.
   * @param elementBinders TreeArray of elementBinders for the nodes with the css class `ng-directive`
   *        from `templateNodes`.
   */  
  constructor(templateContainer:NodeContainer, elementBinders:TreeArrayOfElementBinder) {
    this.templateContainer = templateContainer;
    this.elementBinders = elementBinders;
  }
  createView(injector:Injector, executionContext:Object, inplace:boolean = false):View {
    var container;
    if (inplace) {
      container = this.templateContainer;
    } else {
      container = this.templateContainer.cloneNode(true);
    }

    @Provide(View)
    @Inject(Injector)
    function viewProvider(injector:Injector) {
      return new View(container, injector, executionContext);
    }
    var viewInjector = injector.createChild([viewProvider]);
    var view = viewInjector.get(View);

    var boundElements = container.querySelectorAll('.ng-binder');
    reduceTree(this.elementBinders, bindBinder, viewInjector);
    
    return view;

    function bindBinder(parentInjector, binder, index) {
      var childInjector,
        element;
      if (index===0) {
        // the first binder is only a container for NonElementBinders directly on the root 
        // of the element.
        // Don't call it's bind method!
        element = container;
        childInjector = parentInjector;
      } else {
        element = boundElements[index-1];
        childInjector = binder.bind(parentInjector, element);
      }
      binder.nonElementBinders.forEach((nonElementBinder) => {
        var nonElementNode = element.childNodes[nonElementBinder.indexInParent];
        nonElementBinder.bind(childInjector, nonElementNode);
      });
      return childInjector;
    }
  }
}

export class DirectiveClassWithViewFactory {
  static assert(obj) {
    assert(obj).is(assert.structure({
      directive: DirectiveClass,
      viewFactory: ViewFactory
    }));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }    
}

export class TreeArrayOfElementBinder {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(ElementBinder));
    assert(obj).is(TreeArray);
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}

export class NodeBinderArgs {
  static assert(obj) {
    obj.attrs && assert(obj.attrs).is(NodeAttrs);
  }
}

export class ElementBinderArgs extends NodeBinderArgs {
  static assert(obj) {
    obj.decorators && assert(obj.decorators).is(ArrayOfDirectiveClass);
    obj.component && assert(obj.component).is(DirectiveClassWithViewFactory);
  }
}

export class ArrayOfNonElementBinder {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(NonElementBinder));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}

export class NonElementBinderArgs extends NodeBinderArgs {
  static assert(obj) {    
    if (obj.template) {
      assert(obj.template).is(DirectiveClassWithViewFactory);
    }
  }
}

class NodeBinder {
  constructor(data:NodeBinderArgs = {}) {
    this.attrs = data.attrs || new NodeAttrs();
  }
  // TODO: Move this to CompileElement in compile!
  hasBindings() {
    // Note: don't check attrs.init, as they don't define
    // whether there is a binding for the element nor not!
    for (var prop in this.attrs.bind) {
      return true;
    }
    for (var prop in this.attrs.event) {
      return true;
    }
    return false;
  }
  bind(injector:Injector, node:Node):Injector {
    var self = this;
    
    @Provide(NgNode)
    @Inject(Injector)
    function ngNodeProvider(injector:Injector) {
      return new NgNode(node, {
        injector: injector,
        directives: []
      })
    }
    var providers = [ngNodeProvider];
    this._collectDiProviders(providers);
    var childInjector = injector.createChild(providers);
    var ngNode = childInjector.get(NgNode);
    var view = injector.get(View);
    
    var directiveClasses = [];
    this._collectDirectives(directiveClasses);
    directiveClasses.forEach((directiveClass) => {
      var directiveInstance = childInjector.get(directiveClass.clazz);
      this._initExportedProperty(node, directiveInstance, directiveClass.annotation.exports || []);
      ngNode.data().directives.push(directiveInstance);
    });

    var attrName;
    for (attrName in this.attrs.bind) {
      this._setupBidiBinding(view, ngNode, attrName, this.attrs.bind[attrName]);
    }

    var eventHandler = childInjector.get(EventHandler);
    for (attrName in this.attrs.event) {
      eventHandler.listen(node, attrName, this.attrs.event[attrName]);
    }
    return childInjector;

  }
  // TODO: Test this!!
  _setupBidiBinding(view, ngNode, property, expression) {
    var lastValue;
    view.watch(expression, (value) => {
      if (value !== lastValue) {
        ngNode.prop(property, value);
      }
      lastValue = value;
    }, view.executionContext);
    view.watch('prop("'+property+'")', (value) => {
      if (value !== lastValue) {
        view.assign(expression, value, view.executionContext);
      }
      lastValue = value;        
    }, ngNode);
  }
  _initExportedProperty(node, directiveInstance, exportedProps) {
    var self = this;
    exportedProps.forEach(function(propName) {
      if (propName in node) {
        throw new Error('The directive '+JSON.stringify(directiveClass)+' tries to export the property '+propName+
          ' although the property is already present');
      }
      Object.defineProperty(node, propName, {
        get: () => { return directiveInstance[propName]; },
        set: (value) => { directiveInstance[propName] = value; }
      });
      if (propName in self.attrs.init) {
        node[propName] = self.attrs.init[propName];
      }
    });
  }
  _collectDirectives(target) {
  }
  _collectDiProviders(target) {
  }
}

/**
 * This class contains the list of directives,
 * on-*, bind-* and {{}} attributes for an element. 
 * 
 * Given a DOM element and a base injector it will:
 * 1. create a module and install directives into it.
 * 2. create child injector and iterate over directive types to force instantiation of those directives
 * 3. notify EventService of onEvents for this element.
 * 4. initialize the data binding
 * 
 * Lifetime: immutable for the duration of application.
 */
export class ElementBinder extends NodeBinder {
  constructor(data:ElementBinderArgs = {}) {
    super(data);
    this.decorators = data.decorators || [];
    this.component = data.component;
    this.nonElementBinders = [];
    this.level = null;
  }
  addNonElementBinder(binder:NonElementBinder, indexInParent:number) {
    this.nonElementBinders.push(binder);
    binder.setIndexInParent(indexInParent);
  }
  // for ordering ElementBinders into a TreeArray
  setLevel(level:number) {
    this.level = level;
  }
  hasBindings() {
    return super.hasBindings()
      || this.component || this.decorators.length || this.nonElementBinders.length;
  }
  bind(injector:Injector, element:HTMLElement):Injector {
    var childInjector = super.bind(injector, element);
    if (this.component) {
      this._bindComponentTemplate(childInjector, element);
    }
    return childInjector;
  }
  _collectDirectives(target) {
    target.push(...this.decorators);
    if (this.component) {
      target.push(this.component.directive);
    }
  }
  _bindComponentTemplate(injector:Injector, element:HTMLElement) {
    // use the component instance as new execution context
    var componentInstance = injector.get(this.component.directive.clazz);
    var view = this.component.viewFactory.createView(injector, componentInstance);
    // TODO: Make ShadowDOM optional using custom transclusion
    var root = element.createShadowRoot();
    view.appendTo(root);
  }
}


export class NonElementBinder extends NodeBinder {
  constructor(data:NonElementBinderArgs = {}) {
    super(data);
    this.template = data.template;
    this.indexInParent = null;
  }
  setIndexInParent(index:number) {
    this.indexInParent = index;
  }
  _collectDirectives(target) {
    if (this.template) {
      target.push(this.template.directive);
    }
  }
  _collectDiProviders(target) {
    super._collectDiProviders(target);
    var self = this;
    @Provide(ViewPort)
    @Inject(NgNode)
    function viewPortProvider(ngNode) {
      return new ViewPort(ngNode.nativeNode());
    }
    @Provide(ViewFactory)
    function viewFactoryProvider() {
      return self.template.viewFactory;
    }
    if (this.template) {
      target.push(viewPortProvider, viewFactoryProvider);
    }
  }
}

