import {
  TreeArrayOfElementBinder,
  ElementBinder,
  NonElementBinder,
  NodeContainer,
  ChildInjectorConfig,
  CompiledTemplate
} from './types';
import {Injector} from 'di';
import {Inject, Provide} from 'di';
import {View, RootView, ViewPort} from './view';
import {reduceTree} from './util/tree_array';
import {AnnotationProvider} from './util/annotation_provider';
import {AbstractNodeBinder, ElementBinder, NonElementBinder} form './types';
import {NgNode} from './ng_node';
import {TemplateDirective, ComponentDirective, DecoratorDirective, Directive} from './annotations';
import {EventHandler} from './event_handler';
import {SimpleNodeContainer} from './util/simple_node_container';

/*
 * A ViewFactory creates views out of compiled templates.
 */
export class ViewFactory {
  @Inject(Injector, AnnotationProvider, EventHandler)
  constructor(injector:Injector, annotationProvider, eventHandler:EventHandler) {
    this.rootInjector = injector;
    this.annotationProvider = annotationProvider;
    this.eventHandler = eventHandler;
  }
  createComponentTemplate(element:HTMLElement, component: Function):CompiledTemplate {
    element.classList.add('ng-binder');
    return {
      container: new SimpleNodeContainer([element]),
      binders: [
        {
          attrs: {},
          decorators: [],
          component: null,
          nonElementBinders: [],
          level: 0
        },
        {
          attrs: {},
          decorators: [],
          component: component,
          nonElementBinders: [],
          level: 1
        }
      ]
    };
  }
  // TODO: Can't have type assertions and destructering params at the same time
  createRootView({template, executionContext = {}, injectorConfig = null}):RootView {
    var view = this._createView(template, null, executionContext, true, injectorConfig);
    this._installEventHandler(view, template);
    return view;
  }
  // TODO: Can't have type assertions and destructering params at the same time
  createChildView({template, parentView, executionContext = null, injectorConfig = null}):View {
    return this._createView(
      template, parentView,
      executionContext ? executionContext : parentView.executionContext,
      false, injectorConfig
    );
  }
  _createView(template:CompiledTemplate, parentView:View, executionContext:Object, inplace:boolean, injectorConfig:ChildInjectorConfig):View {
    var container;
    var self = this;
    if (inplace) {
      container = template.container;
    } else {
      container = template.container.cloneNode(true);
    }

    @Provide(View)
    @Inject(Injector)
    function viewProvider(injector:Injector) {
      if (!parentView) {
        return new RootView(container, injector, executionContext);
      }
      return new View(parentView, container, injector, executionContext);
    }
    var injector = parentView ? parentView.injector : this.rootInjector;
    // TODO: Mixin the given injectorConfig!
    var viewInjector = injector.createChild([viewProvider]);
    var view = viewInjector.get(View);

    var boundElements = container.querySelectorAll('.ng-binder');
    reduceTree(template.binders, initElement, viewInjector);

    return view;

    function initElement(parentInjector, binder, index) {
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
        childInjector = self._bindElement(binder, parentInjector, element);
      }
      binder.nonElementBinders.forEach((nonElementBinder) => {
        var nonElementNode = element.childNodes[nonElementBinder.indexInParent];
        var nonElementInjector = self._bindNonElement(nonElementBinder, childInjector, nonElementNode);
      });
      return childInjector;
    }
  }
  _bindNodeBasic({
    binder,
    injector,
    node,
    diProviders,
    directiveClasses
  }):Injector {
    var view = injector.get(View);

    @Provide(NgNode)
    @Inject(Injector)
    function ngNodeProvider(injector:Injector) {
      return new NgNode(node, {
        injector: injector,
        view: view,
        directives: []
      })
    }
    // TODO: Only create a new injector if we have
    // directives!!
    var providers = [ngNodeProvider].concat(diProviders).concat(directiveClasses);

    var childInjector = injector.createChild(providers);
    var ngNode = childInjector.get(NgNode);
    var flushQueue = view.rootView.flushQueue;
    ngNode.setFlushQueue(flushQueue.push.bind(flushQueue));

    directiveClasses.forEach((directiveClass) => {
      var directiveInstance = childInjector.get(directiveClass);
      var annotation = this.annotationProvider(directiveClass, Directive);
      setupDirectiveObserve(view, ngNode, directiveInstance, annotation.observe || {});
      setupDirectiveBind(binder, view, ngNode, directiveInstance, annotation.bind || {});
      addEvalEventHandlers(ngNode, view, directiveInstance, annotation.on || {});
      ngNode.data.directives.push(directiveInstance);
    });

    setupBindAttr(binder, view, ngNode);
    addEvalEventHandlers(ngNode, view, view.executionContext, binder.attrs.on || {});
    return childInjector;
  }
  _bindNonElement(
    binder:NonElementBinder,
    injector:Injector,
    node:Node
  ):Injector {
    var self = this;
    @Provide(ViewPort)
    @Inject(NgNode)
    function viewPortProvider(ngNode) {
      return new ViewPort(ngNode.nativeNode);
    }
    @Provide(BoundViewFactory)
    @Inject(View)
    function boundViewFactoryProvider(view) {
      return new BoundViewFactory({
        viewFactory: self,
        template: binder.template.compiledTemplate,
        parentView: view
      });
      return binder.template.viewFactory;
    }

    var directiveClasses = [];
    var diProviders = [];
    if (binder.template) {
      directiveClasses.push(binder.template.directive);
      diProviders.push(viewPortProvider, boundViewFactoryProvider);
    }
    return this._bindNodeBasic({binder, injector, node, diProviders, directiveClasses});
  }
  _bindElement(
    binder:ElementBinder,
    injector:Injector,
    element:HTMLElement
  ):Injector {
    var directiveClasses = [];
    if (binder.decorators) {
      directiveClasses.push(...binder.decorators);
    }
    if (binder.component) {
      directiveClasses.push(binder.component);
    }
    var childInjector = this._bindNodeBasic({binder, injector, node:element, diProviders:[], directiveClasses});
    if (binder.component) {
      this._bindComponentTemplate(binder, childInjector, element);
    }
    return childInjector;
  }
  _bindComponentTemplate(binder:ElementBinder, injector:Injector, element:HTMLElement) {
    var self = this;
    // use the component instance as new execution context
    var componentInstance = injector.get(binder.component);
    var annotation = this.annotationProvider(binder.component, Directive);
    annotation.template.then(createView, function(e) {
      // TODO: Nicer error handling!
      console.log(e.stack);
    });

    function createView(compiledTemplateAndModules) {
      var template = compiledTemplateAndModules.template;
      var view = self.createChildView({
        parentView: injector.get(View),
        template: template,
        executionContext: componentInstance
      });
      self._installEventHandler(view, template);
      // TODO: Make ShadowDOM optional using custom transclusion
      var root = createShadowRoot(element);
      view.appendTo(root);
    }
  }
  _installEventHandler(view, template) {
    this.eventHandler.install(
      view.nodes,
      collectEventNames(template, this.annotationProvider)
    );
  }
}

export class BoundViewFactory {
  constructor({viewFactory, template, parentView}) {
    this.viewFactory = viewFactory;
    this.template = template;
    this.parentView = parentView;
  }
  createView({executionContext = null, injectorConfig = null} = {executionContext:null, injectorConfig:null}) {
    return this.viewFactory.createChildView({
      template: this.template,
      parentView: this.parentView,
      executionContext: executionContext,
      injectorConfig: injectorConfig
    });
  }
}

function collectEventNames(template, annotationProvider, target) {
  target = target || [];
  template.binders.forEach((binder)=>{
    if (binder.attrs && binder.attrs.on) {
      for (var eventName in binder.attrs.on) {
        target.push(eventName);
      }
    }
    var directiveClasses = [];
    if (binder.decorators) {
      directiveClasses.push(...binder.decorators);
    }
    if (binder.component) {
      directiveClasses.push(binder.component);
    }
    directiveClasses.forEach((directiveClass) => {
      var annotation = annotationProvider(directiveClass, Directive);
      if (annotation && annotation.on) {
        for (var eventName in annotation.on) {
          target.push(eventName);
        }
      }
    });
    binder.nonElementBinders.forEach((neb)=>{
      if (neb.template) {
        collectEventNames(neb.template.compiledTemplate, annotationProvider, target);
      }
    });
  });
  return target;
}

function setupBindAttr(binder, view, ngNode) {
  var attrName;
  if (binder.attrs && binder.attrs.bind) {
    for (attrName in binder.attrs.bind) {
      ngNode.addProperties([attrName]);
      setupBidiBinding({
        view, ngNode,
        property: attrName,
        expression: binder.attrs.bind[attrName],
        context: view.executionContext,
        initNodeFromContext: true
      });
    }
  }
}

function addEvalEventHandlers(ngNode, view, context, expressions) {
  for (var eventName in expressions) {
    var events = ngNode.data.events = ngNode.data.events || {};
    events[eventName] = events[eventName] || [];
    events[eventName].push(createHandler(expressions[eventName]));
  }

  function createHandler(expression) {
    // TODO: Provide the event as a local
    return function(event) {
      view.evaluate(expression, context);
    }
  }
}

function setupBidiBinding({view, ngNode, property, expression, context,
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

function setupDirectiveObserve(view, ngNode, directiveInstance, observedExpressions) {
  for (var expression in observedExpressions) {
    initObservedProp(expression, observedExpressions[expression]);
  }

  function initObservedProp(expression, methodName) {
    view.watch(expression, function(newValue, oldValue) {
      directiveInstance[methodName](newValue, oldValue);
    }, directiveInstance);
  }
}

function setupDirectiveBind(binder, view, ngNode, directiveInstance, boundExpressions) {
  for (var propName in boundExpressions) {
    ngNode.addProperties([propName]);
    if (propName in binder.attrs.init) {
      ngNode[propName] = binder.attrs.init[propName];
    }
    setupBidiBinding({
      view, ngNode,
      property: propName,
      expression: boundExpressions[propName],
      context: directiveInstance,
      initContextFromNode: true
    });
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

