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
import {AnnotationProvider} from './util/annotation_provider';
import {AbstractNodeBinder, ElementBinder, NonElementBinder} form './types';
import {TemplateDirective, ComponentDirective, DecoratorDirective, Directive} from './annotations';
import {SimpleNodeContainer} from './util/simple_node_container';
import {Global} from './global';
import {importFragment} from './util/import_node';

/*
 * A ViewFactory creates views out of compiled templates.
 */
export class ViewFactory {
  @Inject(Injector, AnnotationProvider, Global)
  constructor(injector:Injector, annotationProvider, global) {
    this.rootInjector = injector;
    this.annotationProvider = annotationProvider;
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
    @Provide(Node)
    function nodeProvider() {
      return element;
    }
    var viewInjector = (parentInjector||this.rootInjector).createChild(
      [viewProvider, nodeProvider, component]
    );
    var componentInstance = viewInjector.get(component);
    // TODO: install event handlers for Directive.events properties
    var view = viewInjector.get(View);
    this._bindDirective(componentInstance, element, view);

    instantiateTemplate();
    return view;

    function instantiateTemplate() {
      var childView = self.createChildView({
        parentInjector: viewInjector,
        template: template,
        executionContext: componentInstance
      });
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
        this._bindAttrs(binder.attrs, element, view);
        binder.decorators.forEach((decorator) => {
          var childInjector = viewInjector.createChild(this._getDirectiveProviders(element, decorator));
          var directiveInstance = childInjector.get(decorator);
          this._bindDirective(directiveInstance, element, view);
        });
        view.notifyChange(element);
      }
      binder.nonElementBinders.forEach((nodeBinder) => {
        var node = element.childNodes[nodeBinder.indexInParent];
        this._bindAttrs(nodeBinder.attrs, node, view);
        var template = nodeBinder.template;
        if (template) {
          var childInjector = viewInjector.createChild(
              this._getTemplateDirectiveProviders(node, template)
          );
          var directiveInstance = childInjector.get(template.directive);
          this._bindDirective(directiveInstance, node, view);
        }
        view.notifyChange(node);
      });
    });

    return view;
  }
  _bindAttrs(
    attrs,
    node,
    view
  ) {
    for (var propName in attrs.init) {
      node[propName] = attrs.init[propName];
    }
    setupBindAttr(attrs, view, node);
    addEvalEventHandlers(node, view, view.executionContext, attrs.on || {});
  }
  _bindDirective(directiveInstance, node, view) {
    var directiveClass = directiveInstance.constructor;
    var annotation = this.annotationProvider(directiveClass, Directive);
    setupDirectiveObserve(view, directiveInstance, annotation.observe || {});
    setupDirectiveBind(view, node, directiveInstance, annotation.bind || {});
    addEvalEventHandlers(node, view, directiveInstance, annotation.on || {});
  }
  _getDirectiveProviders(node, directiveClass) {
    @Provide(Node)
    function nodeProvider() {
      return node;
    }

    return [nodeProvider, directiveClass];
  }
  _getTemplateDirectiveProviders(node, template) {
    var self = this;
    @Provide(ViewPort)
    function viewPortProvider() {
      return new ViewPort(node);
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
    return this._getDirectiveProviders(node, template.directive)
      .concat([viewPortProvider, boundViewFactoryProvider]);
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

function addEvalEventHandlers(node, view, context, expressions) {
  for (var eventName in expressions) {
    node.addEventListener(eventName, createHandler(expressions[eventName]), false);
  }

  function createHandler(expression) {
    // TODO: Provide the event as a local
    return function(event) {
      view.evaluate(expression, context);
    }
  }
}

function setupBindAttr(attrs, view, node) {
  var attrName;
  if (attrs && attrs.bind) {
    for (attrName in attrs.bind) {
      setupBidiBinding({
        view, node,
        property: attrName,
        expression: attrs.bind[attrName],
        context: view.executionContext,
        initNodeFromContext: true
      });
    }
  }
}

function setupDirectiveBind(view, node, directiveInstance, boundExpressions) {
  for (var propName in boundExpressions) {
    setupBidiBinding({
      view, node,
      property: propName,
      expression: boundExpressions[propName],
      context: directiveInstance,
      initContextFromNode: true
    });
  }
}

function setupBidiBinding({view, node, property, expression, context,
    initNodeFromContext = false, initContextFromNode = false }) {
  if (initNodeFromContext) {
    node[property] = view.evaluate(expression, context);
  } else if (initContextFromNode) {
    view.assign(expression, node[property], context);
  }
  var inSync = false;
  var nodeWatch;
  if (view.isAssignable(expression)) {
    nodeWatch = view.watch(property, function(newValue) {
      if (inSync) {
        return;
      }
      // TODO: Assign should call notifyChange automatically
      // - maybe pass in a flag
      // - need to find out the last object in the expression though...
      view.assign(expression, newValue, context);
    }, node);
  }
  var contextWatch = view.watch(expression, function(newValue) {
    if (inSync) {
      return;
    }
    node[property] = newValue;
    inSync = true;
    view.notifyChange(node);
    inSync = false;
  }, context);
}

function setupDirectiveObserve(view, directiveInstance, observedExpressions) {
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

