import {ArrayLikeOfNodes, NodeAttrs} from './types';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {assert} from 'assert';
import {TemplateDirective, ComponentDirective, DecoratorDirective, EXECUTION_CONTEXT} from './annotations';
import {Injector} from 'di/injector';
import {Provide} from 'di/annotations';
import {ViewPort, View} from './view';
import {TreeArray} from './tree_array';
import {ObjectObserver} from './object_observer';
import {EventHandler} from './event_handler';
import {reduceTree} from './tree_array';

/*
 * A ViewFactory contains a nodes which need to be cloned for each new 
 * instance of a view. It also contains a list of ElementBinders 
 * which need to be bound to the cloned instances of the view. 
 */
export class ViewFactory {  
  /**
   * @param templateNodes nodes of the template. 
   *        All elements in those nodes and their child nodes that should be bound have to have
   *        the css class `ng-directive`.
   * @param elementBinders TreeArray of elementBinders for the nodes with the css class `ng-directive`
   *        from `templateNodes`.
   */  
  constructor(templateNodes:ArrayLikeOfNodes, elementBinders:TreeArrayOfElementBinder) {
    this.templateNodes = templateNodes;
    this.elementBinders = elementBinders;
  }
  createView(injector:Injector, executionContext:Object):View {
    @Provide(EXECUTION_CONTEXT)
    function executionContexteProvider() {
      return executionContext;
    }
    var viewInjector = injector.createChild([executionContexteProvider]);
    var view = new View(this.templateNodes, viewInjector);
    var boundElements = view.fragment.querySelectorAll('.ng-binder');
    reduceTree(this.elementBinders, bindBinder, viewInjector);
    
    return view;

    function bindBinder(parentInjector, binder, index) {
      var childInjector,
        element;
      if (index===0) {
        // the first binder is only a container for NonElementBinders directly on the root 
        // of the element.
        // Don't call it's bind method!
        element = view.fragment;
        childInjector = parentInjector;
      } else {
        element = boundElements[index-1];
        childInjector = binder.bind(parentInjector, element);
      }
      element.injector = childInjector;
      binder.nonElementBinders.forEach((nonElementBinder) => {
        var nonElementNode = element.childNodes[nonElementBinder.indexInParent];
        var nonElInjector = nonElementBinder.bind(childInjector, nonElementNode);
        nonElementNode.injector = nonElInjector;
        // TODO: associate the injector with the nodes
      });
      // TODO: associate the injector with the nodes
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

export class BaseBinderArgs {
  static assert(obj) {
    obj.attrs && assert(obj.attrs).is(NodeAttrs);
  }
}

export class ElementBinderArgs extends BaseBinderArgs {
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

export class NonElementBinderArgs extends BaseBinderArgs {
  static assert(obj) {    
    if (obj.template) {
      assert(obj.template).is(DirectiveClassWithViewFactory);
    }
  }
}

class BaseBinder {
  constructor(data:BaseBinderArgs = {}) {
    this.attrs = data.attrs || new NodeAttrs();
  }
  hasBindings() {
    // Note: don't check attrs.init, as they don't define
    // whether there is a binding for the element nor not!
    return this.attrs.bind.length || this.attrs.event.length;
  }
  bind(injector:Injector, node:Node):Injector {
    var providers = [];
    this._collectDiProviders(node, providers);
    var directiveClasses = [];
    this._collectDirectives(directiveClasses);
    var childInjector = injector.createChild(providers);
    var directiveInstances = directiveClasses.map(function(directiveClass) {
      return childInjector.get(directiveClass.clazz);
    });
    var attrName;
    var objectObserver = childInjector.get(ObjectObserver);
    for (attrName in this.attrs.bind) {
      objectObserver.bindNode(this.attrs.bind[attrName], this.attrs.init[attrName], node, directiveInstances, attrName);
    }

    var eventHandler = childInjector.get(EventHandler);
    for (attrName in this.attrs.event) {
      eventHandler.listen(node, attrName, this.attrs.event[attrName]);
    }
    return childInjector;
  }
  _collectDirectives(target) {
  }
  _collectDiProviders(node:Node, target) {
    var self = this;
    @Provide(Node)
    function nodeProvider() {
      return node;
    }
    target.push(nodeProvider);
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
export class ElementBinder extends BaseBinder {
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


export class NonElementBinder extends BaseBinder {
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
  _collectDiProviders(node:Node, target) {
    super._collectDiProviders(node, target);
    var self = this;
    @Provide(ViewPort)
    function viewPortProvider() {
      return new ViewPort(node);
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

