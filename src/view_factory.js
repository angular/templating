import {NodeAttrs} from './types';
import {NodeContainer} from './node_container';
import {assert} from 'rtts-assert';
import {TemplateDirective, ComponentDirective, DecoratorDirective, Directive} from './annotations';
import {Injector} from 'di';
import {Inject, Provide} from 'di';
import {ViewPort, View, RootView} from './view';
import {TreeArray} from './tree_array';
import {EventHandler} from './event_handler';
import {reduceTree} from './tree_array';
import {NgNode} from './ng_node';
import {AnnotationProvider} from './annotation_provider';

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
  createRootView(injector:Injector, executionContext:Object, inplace:boolean = false):RootView {
    return this._createView(null, injector, executionContext, inplace);
  }
  createChildView(injector:Injector, executionContext:Object, inplace:boolean = false):View {
    return this._createView(injector.get(View), injector, executionContext, inplace);
  }
  _createView(parentView:View, injector:Injector, executionContext:Object, inplace:boolean = false):View {
    var container;
    if (inplace) {
      container = this.templateContainer;
    } else {
      container = this.templateContainer.cloneNode(true);
    }

    @Provide(View)
    @Inject(Injector)
    function viewProvider(injector:Injector) {
      if (!parentView) {
        return new RootView(container, injector, executionContext);
      }
      return new View(parentView, container, injector, executionContext);
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
        childInjector.get(NgNode);
      }
      binder.nonElementBinders.forEach((nonElementBinder) => {
        var nonElementNode = element.childNodes[nonElementBinder.indexInParent];
        var nonElementInjector = nonElementBinder.bind(childInjector, nonElementNode);
        nonElementInjector.get(NgNode);
      });
      return childInjector;
    }
  }
}

export class ViewFactoryPromise {
  static assert(obj) {
    // TODO: How to assert that the result of the promise
    // is a ViewFactory?
    assert(obj).is(Promise);
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
    if (obj.decorators) {
      assert(obj.decorators).is(assert.arrayOf(Function));
    }
    if (obj.component) {
      assert(obj.component).is(Function);
    }
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
      assert(obj.template).is(assert.structure({
        directive: Function,
        viewFactory: ViewFactory
      }));
    }
  }
}

export class NodeBinder {
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
    var view = injector.get(View);
    var annotationProvider = injector.get(AnnotationProvider);

    @Provide(NgNode)
    @Inject(Injector)
    function ngNodeProvider(injector:Injector) {
      return new NgNode(node, {
        injector: injector,
        view: view,
        directives: []
      })
    }
    var providers = [ngNodeProvider];
    this._collectDiProviders(providers);
    var directiveClasses = [];
    this._collectDirectives(directiveClasses);

    // TODO: We should only force the recreation of the
    // directives on this ElememtBinder, not all of the directives!
    var childInjector = injector.createChild(providers, [Directive]);
    var ngNode = childInjector.get(NgNode);
    var flushQueue = view.rootView.flushQueue;
    ngNode.setFlushQueue(flushQueue.push.bind(flushQueue));

    directiveClasses.forEach((directiveClass) => {
      var directiveInstance = childInjector.get(directiveClass);
      var annotation = annotationProvider.annotation(directiveClass, Directive);
      this._setupDirectiveObserve(view, ngNode, directiveInstance, annotation.observe || {});
      this._setupDirectiveBind(view, ngNode, directiveInstance, annotation.bind || {});
      ngNode.data.directives.push(directiveInstance);
    });

    var eventHandler = childInjector.get(EventHandler);
    this._setupViewContextNodeBindings(view, ngNode, eventHandler);
    return childInjector;
  }
  _setupViewContextNodeBindings(view, ngNode, eventHandler) {
    var attrName;
    for (attrName in this.attrs.bind) {
      ngNode.addProperties([attrName]);
      this._setupBidiBinding({
        view, ngNode,
        property: attrName,
        expression: this.attrs.bind[attrName],
        context: view.executionContext,
        initNodeFromContext: true
      });
    }

    for (attrName in this.attrs.event) {
      eventHandler.listen(ngNode.nativeNode, attrName, this.attrs.event[attrName]);
    }
  }
  _setupBidiBinding({view, ngNode, property, expression, context,
      initNodeFromContext = false, initContextFromNode = false }) {
    if (initNodeFromContext) {
      ngNode[property] = view.evaluate(expression, context);
    } else if (initContextFromNode) {
      view.assign(expression, ngNode[property], context);
    }
    if (view.isAssignable(expression)) {
      ngNode.observeProp(property, function(newValue) {
        // Note: This is called in sync!
        // Therfore we don't get into cycle problems.
        view.assign(expression, newValue, context);
      });
    }
    view.watch(expression, function(newValue) {
      ngNode[property] = newValue;
    }, context);

  }
  _setupDirectiveObserve(view, ngNode, directiveInstance, observedExpressions) {
    var self = this;
    for (var expression in observedExpressions) {
      initObservedProp(expression, observedExpressions[expression]);
    }

    function initObservedProp(expression, methodName) {
      view.watch(expression, function(newValue, oldValue) {
        directiveInstance[methodName](newValue, oldValue);
      }, directiveInstance);
    }
  }
  _setupDirectiveBind(view, ngNode, directiveInstance, boundExpressions) {
    for (var propName in boundExpressions) {
      ngNode.addProperties([propName]);
      if (propName in this.attrs.init) {
        ngNode[propName] = this.attrs.init[propName];
      }
      this._setupBidiBinding({
        view, ngNode,
        property: propName,
        expression: boundExpressions[propName],
        context: directiveInstance,
        initContextFromNode: true
      });
    }
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
      target.push(this.component);
    }
  }
  _bindComponentTemplate(injector:Injector, element:HTMLElement) {
    // use the component instance as new execution context
    var componentInstance = injector.get(this.component);
    var annotationProvider = injector.get(AnnotationProvider);
    var annotation = annotationProvider.annotation(this.component, Directive);
    annotation.template.then(createView, function(e) {
      console.log(e.stack)
    });

    function createView(viewFactoryAndModules) {
      var view = viewFactoryAndModules.viewFactory.createChildView(injector, componentInstance);
      // TODO: Make ShadowDOM optional using custom transclusion
      var root = createShadowRoot(element);
      view.appendTo(root);
    }
  }
}

function createShadowRoot(el) {
  var res = ['createShadowRoot', 'webkitCreateShadowRoot'].reduce(function(shadowRoot, fnName) {
    if (!shadowRoot && el[fnName]) {
      shadowRoot = el[fnName]();
    }
    return shadowRoot;
  }, null);
  if (!res) {
    throw new Error('could not find createShadowRoot on the element', el);
  }
  return res;
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
      return new ViewPort(ngNode.nativeNode);
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

