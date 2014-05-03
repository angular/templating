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
import {ImportFragment} from './util/import_node';

/*
 * A ViewFactory creates views out of compiled templates.
 */
export class ViewFactory {
  @Inject(Injector, AnnotationProvider, ImportFragment)
  constructor(injector:Injector, annotationProvider, importFragment) {
    this.rootInjector = injector;
    this.annotationProvider = annotationProvider;
    this.importFragment = importFragment;
  }
  createComponentView(elementName:string, parentInjector:Injector) {
    // Important: Use a <template> tag so that the element
    // is not instantiated right away!
    var container = document.createElement('template');
    container.innerHTML = '<'+elementName+'>';
    var template = {
      container: container.content,
      binders: [{
        nonElementBinders: [],
        decorators: [],
        attrs: {
          init: {},
          bind: {},
          on: {}
        }
      }]
    };
    return this.createChildView({template, parentInjector});
  }
  // Called from angular-element
  // TODO: Can't have type assertions and destructering params at the same time
  _createComponentView({
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
    // TODO: Find a nicer place store this and also the directives...
    element.ngComponent = componentInstance;

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

    var container = this.importFragment(template.container, parentInjector);

    @Provide(View)
    @Inject(Injector)
    function viewProvider(injector:Injector) {
      return new View(parentView, container, injector, executionContext);
    }
    var viewInjector = parentInjector.createChild([viewProvider]);
    var view = viewInjector.get(View);
    var attachCallbacks = [];

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
    setupBidiBinding(view, node, view.executionContext, attrs.bind || {});
    setupEventHandlers(node, view, view.executionContext, attrs.on || {});
  }
  _bindDirective(directiveInstance, node, view) {
    node.ngDirectives = node.ngDirectives || [];
    node.ngDirectives.push(directiveInstance);
    var directiveClass = directiveInstance.constructor;
    var annotation = this.annotationProvider(directiveClass, Directive);
    setupDirectiveObserve(view, directiveInstance, annotation.observe || {});
    setupBidiBinding(view, node, directiveInstance, annotation.bind || {});
    setupEventHandlers(node, view, directiveInstance, annotation.on || {});
    if (annotation.query) {
      view.attachedCallbacks.push(()=>{
        setupDomQueries(node, view, directiveInstance, annotation.query || []);
      });
    }
    // TODO: The attached and detached callbacks should be run after a digest of this
    // view, so they have the initial values from other components...
    if (directiveInstance.attached) {
      view.attachedCallbacks.push(directiveInstance.attached.bind(directiveInstance));
    }
    if (directiveInstance.detached) {
      view.detachedCallbacks.push(directiveInstance.detached.bind(directiveInstance));
    }
  }
  _getDirectiveProviders(node, ...directiveClass) {
    @Provide(Node)
    function nodeProvider() {
      return node;
    }

    return [nodeProvider].concat(directiveClass);
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

function setupEventHandlers(node, view, context, expressions) {
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

function setupBidiBinding(view, source, target, expressionMapping) {
  for (var sourceExpr in expressionMapping) {
    setupBinding(view,
      [{
        context: source,
        expression: sourceExpr
      },{
        context: target,
        expression: expressionMapping[sourceExpr]
      }]
    );
  }

}

function setupBinding(view, contextWithExpressions) {
  var assignableExpressions = [];
  var initValue = null;
  var lastValue;
  contextWithExpressions.forEach(({context, expression}, index) => {
    assignableExpressions[index] = view.isAssignable(expression);
    initValue = initValue || view.evaluate(expression, context);
    view.watch({expression, context,
      callback: (newValue) => update(newValue, index)
    });
  });
  update(initValue, -1);

  function update(newValue, sourceIndex) {
    if (newValue === lastValue) {
      return;
    }
    lastValue = newValue;
    contextWithExpressions.forEach(({context, expression}, index) => {
      if (assignableExpressions[index] && index !== sourceIndex) {
        view.assign({expression, value:newValue, context, notify:true});
      }
    });
  }
}

function setupDirectiveObserve(view, directiveInstance, observedExpressions) {
  for (var expression in observedExpressions) {
    initObservedProp(expression, observedExpressions[expression]);
  }

  function initObservedProp(expression, methodName) {
    var match = expression.match(/(.*)\[\]$/);
    var collection = false;
    if (match) {
      expression = match[1];
      collection = true;
    }
    view.watch({expression, context:directiveInstance, collection,
        callback: (...changeData) => directiveInstance[methodName](...changeData)
    });
  }
}

function setupDomQueries(node, view, directiveInstance, queries) {
  if (directiveInstance instanceof ComponentDirective) {
    afterChildrenUpgrade(()=>{
      queries.forEach(initQuery);
    });
    // TODO
  } else {
    queries.forEach(initQuery);
  }

  function initQuery({
      selector = '', decorator = null, expression, collection = true, watch = false
  }) {
    update({selector, decorator, expression, collection});
    if (watch) {
      // TODO: Make this incremental!
      var observer = new MutationObserver(function() {
        update({selector, decorator, expression, collection});
      });
      observer.observe(node, { childList: true, subtree: true });
    }
  }

  function update({
    selector, decorator, expression, collection
  }) {
    var newValue;
    if (selector === '') {
      var directives = node.ngDirectives || [];
      newValue = directives.filter((directive) => directive instanceof decorator);
    } else if (!collection) {
      var child = normalizeNode(node.querySelector(selector));
      newValue = normalizeNode(child);
    } else {
      var children = Array.prototype.slice.call(node.querySelectorAll(selector));
      newValue = children.map(normalizeNode);
    }
    view.assign({expression, context: directiveInstance, value:newValue, notify:true});
  }

  function normalizeNode(node) {
    return node.ngComponent || node;
  }

  function afterChildrenUpgrade(callback) {
    // TODO: Wait until all children have been upgraded
    // TODO: Same timing as for the attached callback!
    window.setTimeout(callback, 0);
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

