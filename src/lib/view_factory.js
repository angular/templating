import {
  NodeContainer,
  CompiledTemplate
} from './types';
import {Injector, TransientScope} from 'di';
import {Inject, Provide} from 'di';
import {View, ViewPort} from './view';
import {TemplateDirective, ComponentDirective, DecoratorDirective, Directive, Queryable} from './annotations';
import {ComponentLoader} from './component_loader';
import {Parser} form 'expressionist';
import {WatchGroup, childWatchGroupProviders, isDomApi} form './watch_group';
import {RootInjector, NodeInjector} from './di/node_injector';
import {reduceTree} from './util/tree_array';
import {valueProvider, getAnnotation} from './util/misc';

export var EXECUTION_CONTEXT_TOKEN = 'executionContext';

/*
 * A ViewFactory creates views out of compiled templates.
 */
export class ViewFactory {
  @Inject(ComponentLoader, RootInjector)
  constructor(componentLoader, rootInjector) {
    this.rootInjector = rootInjector;
    this.componentLoader = componentLoader;
  }
  // TODO: Can't have type assertions and destructering params at the same time
  // TODO: Can't declare the return type as View, as traceur asserts the return type
  // also for nested functions
  createComponentView({
    element = null,
    component,
    providers = [],
    viewPort
  }) {
    @Provide(View)
    @Queryable('view')
    function ViewProvider(nodeInjector:NodeInjector) {
      return new View([element], nodeInjector, viewPort);
    }
    var localProviders = [...providers, ViewProvider];
    var annotation = getAnnotation(component, Directive);
    if (!element) {
      element = document.createElement(annotation.selector);
    }
    var nodeInjector = this._createComponent({element, component, localProviders, parentNodeInjector: viewPort._anchorInjector});
    return nodeInjector.get(View);
  }
  _createComponent({
    element,
    component,
    providers = [],
    parentNodeInjector
  }) {
    var annotation = getAnnotation(component, Directive);
    var localProviders = [...providers, component, ...this._getComponentProviders(component)];
    var nodeInjector = parentNodeInjector.createChild({node: element, providers: localProviders});

    this._initComponentDirective({
      nodeInjector, component, element
    });
    return nodeInjector;
  }
  _initComponentDirective({nodeInjector, component, element}) {
    var componentInstance = nodeInjector.get(component);
    var annotation = getAnnotation(component, Directive);
    var template = this.componentLoader.getTemplateForDirective(component);

    this._bindDirective(nodeInjector, component);
    var childData = this._initTemplate({
      template,
      providers: annotation.shadowProviders || [],
      isShadowRoot: true,
      executionContext: componentInstance,
      parentNodeInjector: nodeInjector
    });
    if (!childData.inplace) {
      if (annotation.shadowDOM) {
        // TODO: I assume that the container is a documentFragment here,
        // which should be ok -> add an assertion!
        createShadowRoot(element).appendChild(childData.container);
      } else {
        // TODO: I assume that the container is a documentFragment here,
        // which should be ok -> add an assertion!
        // TODO: Implement the <content> tag for non shadow DOM!
        element.innerHTML = '';
        element.appendChild(childData.container);
      }
    }
    childData.injector.appendTo(nodeInjector);
  }
  // TODO: Can't have type assertions and destructering params at the same time
  // TODO: Can't declare the return type as View, as traceur asserts the return type
  // also for nested functions
  createChildView({template, providers = [], viewPort, executionContext = null}) {
    var localProviders = [...providers, ...childWatchGroupProviders()];
    var childData = this._initTemplate({
      template, providers: localProviders, executionContext, parentNodeInjector: viewPort._anchorInjector,
      viewPort: viewPort
    });
    return childData.injector.get(View);
  }
  _initTemplate({template, providers, parentNodeInjector, isShadowRoot = false, executionContext = null, viewPort = null}) {
    @Provide(View)
    @Queryable('view')
    function ViewProvider(nodeInjector:NodeInjector) {
      return new View(container.childNodes, nodeInjector, viewPort);
    }

    var localProviders = [...providers];
    if (executionContext) {
      localProviders.push(valueProvider(EXECUTION_CONTEXT_TOKEN, executionContext));
    }
    var self = this;
    var container;
    var inplace = document.contains(template.container);
    if (inplace) {
      container = template.container;
    } else {
      // Note: This will create custom elements.
      container = document.importNode(template.container, true);
    }
    if (viewPort) {
      localProviders.push(ViewProvider);
    }
    var viewInjector = parentNodeInjector.createChild({node:null, providers: localProviders, isShadowRoot: isShadowRoot});

    // Query for bindings of the template and angular custom elements,
    // so we can create the binder hierarchy in the correct order
    var boundElements = container.querySelectorAll('.ng-binder');
    reduceTree(template.binders, initElement, viewInjector);
    return {
      container,
      inplace: inplace,
      injector: viewInjector
    };

    function initElement(parentInjector, binder, index) {
      var element;
      var elementInjector;
      if (index === 0) {
        // the first binder is only a container for TextBinders directly on the root
        // of the element.
        elementInjector = parentInjector;
        element = container;
      } else {
        element = boundElements[index-1];
        var localProviders = [...self._attrProviders(binder.attrs)];
        // remove the ng-binder class as custom elements that contain angular components
        // also have elements marked with ng-binder in their template.
        element.classList.remove('ng-binder');
        binder.decorators.forEach((decorator) => {
          localProviders.push(decorator, ...self._getDirectiveProviders(decorator));
        });
        if (element.ngInjectorFactory) {
          elementInjector = element.ngInjectorFactory(localProviders);
        } else if (binder.component) {
          elementInjector = self._createComponent({
            element,
            component: binder.component,
            providers: localProviders,
            parentNodeInjector: parentInjector
          });
        } else {
          var template = binder.template;
          if (template) {
            localProviders.push(template.directive, ...self._getTemplateDirectiveProviders(element, template));
          }
          elementInjector = parentInjector.createChild({node: element, providers: localProviders});
        }
        self._bindAttrs(elementInjector, binder.attrs);
        binder.decorators.forEach((decorator) => {
          self._bindDirective(elementInjector, decorator);
        });
        if (binder.template) {
          self._bindDirective(elementInjector, binder.template.directive);
        }
        elementInjector.appendTo(parentInjector);
      }
      binder.textBinders.forEach((textBinder) => {
        var textNode = element.childNodes[textBinder.indexInParent];
        var nodeInjector = elementInjector.createChild({node:textNode, providers});
        nodeInjector.get(setupNodeBinding(EXECUTION_CONTEXT_TOKEN, {
          'textContent': textBinder.expression
        }));
        nodeInjector.appendTo(elementInjector);
      });
      return elementInjector;
    }
  }
  _bindAttrs(
    nodeInjector,
    attrs
  ) {
    if (!isEmpty(attrs.bind)) {
      nodeInjector.get(setupNodeBinding(EXECUTION_CONTEXT_TOKEN, attrs.bind));
    }
    if (!isEmpty(attrs.on)) {
      nodeInjector.get(setupEventHandlers(EXECUTION_CONTEXT_TOKEN, attrs.on));
    }
  }
  _bindDirective(nodeInjector, directive) {
    // make sure the directive is instantiated
    nodeInjector.get(directive);
    var annotation = getAnnotation(directive, Directive);
    if (!isEmpty(annotation.observe)) {
      nodeInjector.get(setupDirectiveObserve(directive, annotation.observe));
    }
    if (!isEmpty(annotation.bind)) {
      nodeInjector.get(setupNodeBinding(directive, annotation.bind));
    }
    if (!isEmpty(annotation.on)) {
      nodeInjector.get(setupEventHandlers(directive, annotation.on));
    }
  }
  _attrProviders(attrs) {
    @Inject(Node)
    @Queryable(attrs.queryable)
    function queryableNodeProvider(node) {
      return node;
    }
    @Provide(InitAttrs)
    function initAttrsProvider() {
      return attrs.init;
    }
    if (attrs.queryable) {
      return [queryableNodeProvider, initAttrsProvider];
    } else {
      return [initAttrsProvider];
    }
  }
  _getDirectiveProviders(directive) {
    var annotation = getAnnotation(directive, Directive);
    if (annotation.providers) {
      return annotation.providers;
    } else {
      return [];
    }
  }
  _getComponentProviders(component) {
    var providers = [...childWatchGroupProviders(), ...this._getDirectiveProviders(component)];
    return providers;
  }
  _getTemplateDirectiveProviders(node, template) {
    var self = this;
    @Provide(BoundViewFactory)
    @Inject(ViewPort)
    function boundViewFactoryProvider(viewPort) {
      return new BoundViewFactory({
        viewFactory: self,
        template: template.compiledTemplate,
        viewPort: viewPort
      });
    }

    @Provide(ViewPort)
    @Inject(NodeInjector)
    @Queryable('viewPort')
    function viewPortProvider(nodeInjector) {
      return new ViewPort(node, nodeInjector);
    }
    return [boundViewFactoryProvider, viewPortProvider, ...this._getDirectiveProviders(template.directive)];
  }
}

export class BoundViewFactory {
  constructor({viewFactory, template, viewPort}) {
    this.viewFactory = viewFactory;
    this.template = template;
    this.viewPort = viewPort;
  }
  createView({executionContext = null, providers = []} = {executionContext:null, providers:[]}) {
    return this.viewFactory.createChildView({
      template: this.template,
      providers: providers,
      executionContext: executionContext,
      viewPort: this.viewPort
    });
  }
}

// all initial attribute values that are not interpolated, bind-.. or on-...
export var InitAttrs = 'initAttrs';

function setupEventHandlers(contextToken, expressions) {
  @Inject(Node, contextToken, Parser)
  @TransientScope
  function setup(node, context, parser) {
    for (var eventName in expressions) {
      node.addEventListener(eventName, createHandler(expressions[eventName]), false);
    }

    function createHandler(expression) {
      var parsedExpr = parser.parse(expression).bind(context);
      // TODO: Provide the event as a local
      return function(event) {
        parsedExpr.eval();
      }
    }
  }

  return setup;
}

function setupNodeBinding(targetToken, expressionMapping) {
  @Inject(WatchGroup, Node, Parser, targetToken)
  @TransientScope
  function setup(watchGroup, node, parser, target) {
    if (target === node) {
      throw new Error("Don't use 'bind' for custom elements as 'this' is the element itself!");
    }
    for (var nodeExpr in expressionMapping) {
      // The order is important:
      // A truthy value in the node should overwrite the value
      // in the node
      setupBinding(parser, watchGroup,
        [{
          context: node,
          expression: nodeExpr
        },{
          context: target,
          expression: expressionMapping[nodeExpr]
        }]
      );
    }
  }
  return setup;
}

function setupBinding(parser, watchGroup, contextWithExpressions) {
  var assignableExpressions = [];
  var initValue = undefined;
  var initIndex = -1;
  var lastValue;
  contextWithExpressions.forEach(({context, expression}, index) => {
    var parsedExpr = parser.parse(expression);
    var boundExpr = parsedExpr.bind(context);
    assignableExpressions[index] = {
      assignable: parsedExpr.isAssignable,
      boundExpr: boundExpr
    };
    if (initIndex === -1) {
      // take the first defined value
      var localValue = boundExpr.eval();
      if (localValue !== undefined && localValue !== null) {
        initIndex = index;
        initValue = localValue;
      }
    }
    watchGroup.watch({expression, context, callback: () => {
      // TODO: Don't use the newValue provided by WatchTower
      // as it might be out of date and can lead to infinite loops!
      // -> change watchtower!
      var newValue = boundExpr.eval();
      update(newValue, index);
    }});
  });
  if (initIndex !== -1) {
    update(initValue, initIndex);
  }

  function update(newValue, sourceIndex) {
    if (newValue === lastValue) {
      return;
    }
    lastValue = newValue;
    assignableExpressions.forEach(({assignable, boundExpr}, index) => {
      if (assignable && index !== sourceIndex) {
        boundExpr.assign(newValue);
      }
    });
  }
}

function setupDirectiveObserve(directive, observedExpressions) {
  @Inject(WatchGroup, directive)
  @TransientScope
  function setup(watchGroup, directiveInstance) {
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
      watchGroup.watch({expression, context:directiveInstance, collection,
          callback: (...changeData) => directiveInstance[methodName](...changeData)
      });
    }
  }

  return setup;
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

function isEmpty(obj) {
  for (var prop in obj) {
    return false;
  }
  return true;
}
