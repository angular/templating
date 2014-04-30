import {
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
import {Global} from './global';
import {importFragment} from './util/import_node';

/*
 * A ViewFactory creates views out of compiled templates.
 */
export class ViewFactory {
  @Inject(Injector, AnnotationProvider, EventHandler, Global)
  constructor(injector:Injector, annotationProvider, eventHandler:EventHandler, global) {
    this.rootInjector = injector;
    this.annotationProvider = annotationProvider;
    this.eventHandler = eventHandler;
    this.global = global;
  }
  // TODO: Can't have type assertions and destructering params at the same time
  createComponentView({
    element,
    component,
    template,
    parentInjector = null,
  }):View {
    var self = this;

    @Provide(View)
    @Inject(Injector, component)
    function viewProvider(injector, componentInstance) {
      var container = new SimpleNodeContainer([element]);
      if (!parentInjector) {
        return new RootView(container, injector, componentInstance);
      }
      return new View(parentInjector.get(View), container, injector, componentInstance);
    }
    @Provide(NgNode)
    @Inject(View)
    function ngNodeProvider(view) {
      return createNgNode(element, view);
    }
    var viewInjector = (parentInjector||this.rootInjector).createChild(
      [viewProvider, ngNodeProvider, component]
    );
    var ngNode = viewInjector.get(NgNode);
    var componentInstance = viewInjector.get(component);
    // TODO: We need to install the event handler twice for @Directive.events property!
    // - for the component node, and also for its template?
    // --> only if we are creating a root view!
    // --> otherwise we can rely on the parent event handler to do the job!
    // --> this is not workig if our component provides a special configuration
    //     for events of custom elements!
    var view = viewInjector.get(View);
    this._bindDirective(componentInstance, ngNode, view);

    ngNode.data.componentView = view;
    instantiateTemplate();
    return view;

    function instantiateTemplate() {
      var childView = self.createChildView({
        parentInjector: viewInjector,
        template: template,
        executionContext: componentInstance
      });
      self._installEventHandler(view, template);
      var annotation = self.annotationProvider(component, Directive);
      if (annotation.shadowDOM) {
        childView.appendTo(createShadowRoot(element));
      } else {
        // TODO: Implement the <content> tag for non shadow DOM!
        element.innerHTML = '';
        childView.appendTo(element);
      }
    }
  }
  // TODO: Can't have type assertions and destructering params at the same time
  createChildView({template, parentInjector, executionContext = null}):View {
    var parentView = parentInjector.get(View);
    if (!executionContext) {
      executionContext = parentView.executionContext;
    }

    var container = importFragment(this.global.document, template.container, parentInjector);

    @Provide(View)
    @Inject(Injector)
    function viewProvider(injector:Injector) {
      return new View(parentView, container, injector, executionContext);
    }
    var viewInjector = parentInjector.createChild([viewProvider]);
    var view = viewInjector.get(View);

    var boundElements = container.querySelectorAll('.ng-binder');
    template.binders.forEach((binder, index) => {
      var element;
      if (index===0) {
        // the first binder is only a container for NonElementBinders directly on the root
        // of the element.
        element = container;
      } else {
        element = boundElements[index-1];
        var ngNode = createNgNode(element, view);
        this._bindAttrs(binder.attrs, ngNode, view);
        binder.decorators.forEach((decorator) => {
          var childInjector = viewInjector.createChild(this._getDirectiveProviders(ngNode, decorator));
          var directiveInstance = childInjector.get(decorator);
          this._bindDirective(directiveInstance, ngNode, view);
        });
      }
      binder.nonElementBinders.forEach((nodeBinder) => {
        var ngNode = createNgNode(element.childNodes[nodeBinder.indexInParent], view);
        this._bindAttrs(nodeBinder.attrs, ngNode, view);
        var template = nodeBinder.template;
        if (template) {
          var childInjector = viewInjector.createChild(
              this._getTemplateDirectiveProviders(ngNode, template)
          );
          var directiveInstance = childInjector.get(template.directive);
          this._bindDirective(directiveInstance, ngNode, view);
        }
      });
    });

    return view;
  }
  _bindAttrs(
    attrs,
    ngNode,
    view
  ) {
    // TODO: Change the compiler to only include the properties
    // that are bound in binder.attrs.init!
    for (var propName in attrs.init) {
      ngNode.addProperties([propName]);
      ngNode[propName] = attrs.init[propName];
    }
    setupBindAttr(attrs, view, ngNode);
    addEvalEventHandlers(ngNode, view, view.executionContext, attrs.on || {});
  }
  _bindDirective(directiveInstance, ngNode, view) {
    var directiveClass = directiveInstance.constructor;
    var annotation = this.annotationProvider(directiveClass, Directive);
    setupDirectiveObserve(view, ngNode, directiveInstance, annotation.observe || {});
    setupDirectiveBind(view, ngNode, directiveInstance, annotation.bind || {});
    addEvalEventHandlers(ngNode, view, directiveInstance, annotation.on || {});
    ngNode.data.directives.push(directiveInstance);
  }
  _getDirectiveProviders(ngNode, directiveClass) {
    @Provide(NgNode)
    function ngNodeProvider() {
      return ngNode;
    }

    return [ngNodeProvider, directiveClass];
  }
  _getTemplateDirectiveProviders(ngNode, template) {
    var self = this;
    @Provide(ViewPort)
    @Inject(NgNode)
    function viewPortProvider(ngNode) {
      return new ViewPort(ngNode.nativeNode);
    }
    @Provide(BoundViewFactory)
    @Inject(Injector)
    function boundViewFactoryProvider(injector) {
      return new BoundViewFactory({
        viewFactory: self,
        template: template.compiledTemplate,
        parentInjector: injector
      });
    }
    return this._getDirectiveProviders(ngNode, template.directive)
      .concat([viewPortProvider, boundViewFactoryProvider]);
  }
  _installEventHandler(view, template) {
    this.eventHandler.install(
      view.nodes,
      collectEventNames(template, this.annotationProvider)
    );
  }
}

export class BoundViewFactory {
  constructor({viewFactory, template, parentInjector}) {
    this.viewFactory = viewFactory;
    this.template = template;
    this.parentInjector = parentInjector;
  }
  createView({executionContext = null, injectorConfig = null} = {executionContext:null, injectorConfig:null}) {
    // TODO: If we have an injectorConfig, create an intermediate injector here!
    return this.viewFactory.createChildView({
      template: this.template,
      parentInjector: this.parentInjector,
      executionContext: executionContext
    });
  }
}

function createNgNode(node, view) {
  var ngNode = node.ngNode;
  if (!ngNode) {
    ngNode = new NgNode(node, {
      view: view,
      directives: []
    });
    ngNode.setFlushQueue((callback) => view.rootView.flushQueue.push(callback));
  }
  return ngNode;
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

function setupBindAttr(attrs, view, ngNode) {
  var attrName;
  if (attrs && attrs.bind) {
    for (attrName in attrs.bind) {
      setupBidiBinding({
        view, ngNode,
        property: attrName,
        expression: attrs.bind[attrName],
        context: view.executionContext,
        initNodeFromContext: true
      });
    }
  }
}

function setupDirectiveBind(view, ngNode, directiveInstance, boundExpressions) {
  for (var propName in boundExpressions) {
    setupBidiBinding({
      view, ngNode,
      property: propName,
      expression: boundExpressions[propName],
      context: directiveInstance,
      initContextFromNode: true
    });
  }
}

function setupBidiBinding({view, ngNode, property, expression, context,
    initNodeFromContext = false, initContextFromNode = false }) {
  ngNode.addProperties([property]);
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

