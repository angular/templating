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
    var annotation = self.annotationProvider(component, Directive);

    // TODO: Find a nicer place store this and also the directives...
    element.ngComponent = componentInstance;

    var view = viewInjector.get(View);
    var shadowRoot;
    if (annotation.shadowDOM) {
      shadowRoot = createShadowRoot(element);
    }

    this._bindDirective(componentInstance, element, view);

    instantiateTemplate();
    return view;

    function instantiateTemplate() {
      var childView = self.createChildView({
        parentInjector: viewInjector,
        template: template,
        executionContext: componentInstance
      });
      if (annotation.shadowDOM) {
        childView.appendTo(shadowRoot);
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
      var initValue = attrs.init[propName];
      if (initValue) {
        node[propName] = initValue;
      }
    }
    setupNodeBinding(view, node, view.executionContext, attrs.bind || {});
    setupEventHandlers(node, view, view.executionContext, attrs.on || {});
    if (attrs.role) {
      setupRole(node, view, node, attrs.role);
    }
  }
  _bindDirective(directiveInstance, node, view) {
    node.ngDirectives = node.ngDirectives || [];
    node.ngDirectives.push(directiveInstance);
    var directiveClass = directiveInstance.constructor;
    var annotation = this.annotationProvider(directiveClass, Directive);
    setupDirectiveObserve(view, directiveInstance, annotation.observe || {});
    setupNodeBinding(view, node, directiveInstance, annotation.bind || {});
    setupEventHandlers(node, view, directiveInstance, annotation.on || {});
    setupRoleQueries(node, view, directiveInstance, annotation.query || []);
    if (directiveInstance.attached) {
      view.callbacks.attached.push(directiveInstance.attached.bind(directiveInstance));
    }
    if (directiveInstance.detached) {
      view.callbacks.detached.push(directiveInstance.detached.bind(directiveInstance));
    }
    if (directiveInstance.moved) {
      view.callbacks.moved.push(directiveInstance.moved.bind(directiveInstance));
    }
    if (annotation.role) {
      setupRole(node, view, directiveInstance, annotation.role);
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

function setupNodeBinding(view, node, target, expressionMapping) {
  for (var nodeExpr in expressionMapping) {
    // The order is important:
    // A truthy value in the directive/component should overwrite the value
    // in the node
    setupBinding(view,
      [{
        context: target,
        expression: expressionMapping[nodeExpr]
      },{
        context: node,
        expression: nodeExpr
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
    // use the first truthy value
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

function setupRole(node, view, target, role) {
  var roles = node.ngRoles = node.ngRoles || [];
  roles.push({
    role: role,
    target: target
  });
  node.classList.add('ng-role-'+role);
  view.containedRoles.push(role);
}

function setupRoleQueries(node, view, directiveInstance, queryExpressions) {
  var hasQueries = false;
  var queries = {};
  for (var role in queryExpressions) {
    var expression = queryExpressions[role];
    var match = role.match(/(:shadow\s*)?(.*?)(\[\])?$/);
    var collection = !!match[3];
    role = match[2];
    var shadow = !!match[1];
    queries[role] = initQuery(role, expression, collection, shadow);
    hasQueries = true;
  }
  if (hasQueries) {
    node.addEventListener('ngInvalidateRoles', (event) => {
      event.detail.roles.forEach((role) => {
        var query = queries[role];
        if (query) {
          view.rootView.invalidRoleQueries.push(query);
        }
      });
    });
  }

  function initQuery(role, expression, collection, shadow) {
    var root = node;
    if (shadow) {
      root = node.shadowRoot;
    }
    var childNodes = root.getElementsByClassName('ng-role-'+role);
    var query = {
      node: node,
      childNodes: childNodes,
      role: role,
      collection: collection,
      directive: directiveInstance,
      expression: expression
    };
    view.rootView.invalidRoleQueries.push(query);
    return query;
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

