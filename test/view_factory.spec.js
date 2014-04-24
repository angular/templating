import {use, inject} from 'di/testing';
import {Injector, Inject, Provide} from 'di';
import {ViewPort, View, RootView} from '../src/view';
import {ViewFactory, BoundViewFactory} from '../src/view_factory';
import {$, $html} from './dom_mocks';
import {DecoratorDirective, TemplateDirective, ComponentDirective} from '../src/annotations';
import {EventHandler} from '../src/event_handler';
import {$, $html} from './dom_mocks';
import {NgNode} from '../src/ng_node';
import {SimpleNodeContainer} from '../src/util/simple_node_container';

describe('ViewFactory', () => {
  function createBinders(levels) {
    var binders = [];
    for (var i=0; i<levels.length; i++) {
      binders.push({
        level: levels[i],
        nonElementBinders: [],
        component: null,
        decorators: [],
        attrs: {
          init: {},
          bind: {},
          on: {}
        }
      });
    }
    return binders;
  }

  function createNonElementBinders(indicesInParent) {
    var binders = [];
    for (var i=0; i<indicesInParent.length; i++) {
      binders.push({
        indexInParent: indicesInParent[i],
        template: null,
        attrs: {
          init: {},
          bind: {},
          on: {}
        }
      });
    }
    return binders;
  }

  describe('createComponentTemplate', ()=>{

    it('should create the correct container', ()=>{
      class SomeComponent {}
      inject(ViewFactory, (viewFactory)=>{
        var el = $('<div></div>')[0];
        var template = viewFactory.createComponentTemplate(el, SomeComponent);
        expect(template.container.childNodes).toEqual([el]);
      });
    });

    it('should create an empty root element binder', ()=>{
      class SomeComponent {}
      inject(ViewFactory, (viewFactory)=>{
        var el = $('<div></div>')[0];
        var template = viewFactory.createComponentTemplate(el, SomeComponent);
        expect(template.binders[0]).toEqual({
          attrs: {},
          decorators: [],
          component: null,
          nonElementBinders: [],
          level: 0
        });
      });
    });

    it('should create the correct component binder', ()=>{
      class SomeComponent {}
      inject(ViewFactory, (viewFactory)=>{
        var el = $('<div></div>')[0];
        var template = viewFactory.createComponentTemplate(el, SomeComponent);
        expect(template.binders[1]).toEqual({
          attrs: {},
          decorators: [],
          component: SomeComponent,
          nonElementBinders: [],
          level: 1
        });
      });
    });

    it('should be able to create a view out of the template', ()=>{
      inject(ViewFactory, (viewFactory)=>{
        var componentInstance;
        var container = $('<div>a</div>')[0];
        var templatePromise = {
          then: function(callback) {
            callback({
              template: {
                container: container,
                binders: []
              }
            });
          }
        };

        @ComponentDirective({template: templatePromise})
        class SomeComponent {
          constructor() {
            componentInstance = this;
          }
        }

        var el = $('<div></div>')[0];
        var template = viewFactory.createComponentTemplate(el, SomeComponent);
        var view = viewFactory.createRootView({template});
        expect(componentInstance).toBeTruthy();
      });

    });
  });

  describe('create root or child view', ()=>{
    var viewFactory, injector, eventHandler;

    beforeEach(()=>{
      inject(Injector, ViewFactory, EventHandler, (_injector, _viewFactory, _eventHandler)=>{
        injector = _injector;
        viewFactory = _viewFactory;
        eventHandler = _eventHandler;
        spyOn(viewFactory, '_bindElement').and.callFake(function(binder, injector) {
          return binder.childInjector = injector.createChild();
        });
        spyOn(viewFactory, '_bindNonElement').and.callFake(function(binder, injector) {
          return binder.childInjector = injector.createChild();
        });
        spyOn(eventHandler, 'install');
      });
    });

    it('should not clone the given nodes for root views', () => {
      var container = $('<div>a<a></a></div>')[0];
      var view = viewFactory.createRootView({
        template: {
          container: container,
          binders: []
        }
      });
      expect(Array.prototype.slice.call(container.childNodes)).toEqual(view.nodes);
    });

    it('should clone the given nodes for child views with element containers', () => {
      var rootView = viewFactory.createRootView({
        template: {
          container: $('<div></div>')[0],
          binders: []
        }
      });
      var container = $('<div>a<a></a></div>')[0];
      var view = viewFactory.createChildView({
        parentView: rootView,
        template: {
          container: container,
          binders: []
        }
      });
      expect(Array.prototype.slice.call(container.childNodes)).not.toEqual(view.nodes);
      expect($html(container.childNodes)).toBe($html(view.nodes));
    });

    it('should clone the given nodes for child views with SimpleNodeContainers', () => {
      var rootView = viewFactory.createRootView({
        template: {
          container: $('<div></div>')[0],
          binders: []
        }
      });
      var container = new SimpleNodeContainer($('a<a></a>'));
      var view = viewFactory.createChildView({
        parentView: rootView,
        template: {
          container: container,
          binders: []
        }
      });
      expect(Array.prototype.slice.call(container.childNodes)).not.toEqual(view.nodes);
      expect($html(container.childNodes)).toBe($html(view.nodes));
    });

    it('should not reparent the given nodes', ()=>{
      var container = $('<div>a</div>')[0]
      var node = container.childNodes[0];
      viewFactory.createRootView({
        template: {
          container: container,
          binders: []
        }
      });
      expect(node.parentNode).toBe(container);
    });

    it('should create a child injector and provide the view on the new injector', ()=>{
      var view = viewFactory.createRootView({
        template: {
          container: $('<div>a</div>')[0],
          binders: []
        }
      });
      expect(view.injector.parent).toBe(injector);
      expect(view.injector.get(View)).toBe(view);
    });

    it('should save the executionContext on the view', ()=>{
      var execContext = {};
      var view = viewFactory.createRootView({
        template: {
          container: $('<div>a</div>')[0],
          binders: []
        },
        executionContext: execContext
      });
      expect(view.executionContext).toBe(execContext);
    });

    it('should use the parentViews executionContext by default', ()=>{
      var execContext = {};
      var rootView = viewFactory.createRootView({
        template: {
          container: $('<div></div>')[0],
          binders: []
        },
        executionContext: execContext
      });
      var view = viewFactory.createChildView({
        parentView: rootView,
        template: {
          container: $('<div>a</div>')[0],
          binders: []
        }
      });
      expect(view.executionContext).toBe(execContext);
    });

    it('should save the parentView in the view', ()=>{
      var rootView = viewFactory.createRootView({
        template: {
          container: $('<div></div>')[0],
          binders: []
        }
      });
      var childView = viewFactory.createChildView({
        parentView: rootView,
        template: {
          container: $('<div></div>')[0],
          binders: []
        }
      });
      expect(childView.parentView).toBe(rootView);
    });

    it('should only use the NonElementBinders of the root element binder', ()=>{
      var binders = createBinders([0]);
      var nonElBinders = binders[0].nonElementBinders = createNonElementBinders([0,2]);
      var view = viewFactory.createRootView({
        template: {
          container: $('<div>a<a></a>b</div>')[0],
          binders: binders
        }
      });

      expect(viewFactory._bindElement).not.toHaveBeenCalled();
      var calls = viewFactory._bindNonElement.calls;
      expect(calls.argsFor(0)).toEqual([nonElBinders[0], view.injector, view.nodes[0]]);
      expect(calls.argsFor(1)).toEqual([nonElBinders[1], view.injector, view.nodes[2]]);
    });

    it('should use the second and further binders with the elements that have the css class "ng-binder"', ()=>{
      var binders = createBinders([0,1]);
      var view = viewFactory.createRootView({
        template: {
          container: $('<div><a></a><b class="ng-binder"></b></div>')[0],
          binders: binders
        }
      });
      var calls = viewFactory._bindElement.calls;
      expect(calls.count()).toBe(1);
      expect(calls.argsFor(0)[2]).toBe(view.nodes[1]);
    });

    it('should pass the injector that is returned by a binder to its children', () => {
      var binders = createBinders([0,1,2,1]);
      var view = viewFactory.createRootView({
        template: {
          container: $('<div><a class="ng-binder"><b class="ng-binder"></b></a><a class="ng-binder"></div>')[0],
          binders: binders
        }
      });

      var calls = viewFactory._bindElement.calls;
      expect(calls.argsFor(0)[1]).toBe(view.injector);
      expect(calls.argsFor(1)[1].parent).toBe(view.injector);
      expect(calls.argsFor(2)[1]).toBe(view.injector);
    });

    it('should use NonElementBinders of non root element binders', () => {
      var binders = createBinders([0,1]);
      var nonElBinders = binders[1].nonElementBinders = createNonElementBinders([0]);
      var view = viewFactory.createRootView({
        template: {
          container: $('<div><a class="ng-binder">c</a></div>')[0],
          binders: binders
        }
      });

      var calls = viewFactory._bindNonElement.calls;
      expect(calls.count()).toBe(1);
      expect(calls.argsFor(0)).toEqual([nonElBinders[0], binders[1].childInjector, view.nodes[0].childNodes[0]]);
    });

    it('should initialize the EventHandler with the events of the template', ()=>{
      @DecoratorDirective({on: {'dirEvent': 'expr1'}})
      class SomeDirective {}

      var binders = createBinders([0,1,1]);
      binders[1].attrs.on = {'event1':'expr2'};
      binders[1].decorators.push(SomeDirective);
      binders[2].attrs.on = {'event2':'expr3'};
      var container = $('<div><a class="ng-binder"></a><b class="ng-binder"></b></div>')[0];
      var view = viewFactory.createRootView({
        template: {
          container: container,
          binders: binders
        }
      });
      expect(eventHandler.install).toHaveBeenCalledWith(
        Array.prototype.slice.call(container.childNodes),
        ['event1', 'dirEvent', 'event2']
      );
    });

    it('should initialize the EventHandler with the events of template directives', ()=>{
      var binders = createBinders([0,1]);
      var templateDirBinders = createBinders([0,1]);
      templateDirBinders[1].attrs.on = {'event1': 'expr1'}

      var nonElBinders = binders[1].nonElementBinders = createNonElementBinders([0]);
      nonElBinders[0].template = {
        compiledTemplate: {
          container: $('<div></div>')[0],
          binders: templateDirBinders
        },
        directive: null
      };
      var container = $('<div><a class="ng-binder">b</a></div>')[0];
      var view = viewFactory.createRootView({
        template: {
          container: container,
          binders: binders
        }
      });
      expect(eventHandler.install).toHaveBeenCalledWith(
        Array.prototype.slice.call(container.childNodes),
        ['event1']
      );
    });

  });

  describe('bind nodes', ()=>{
    var injector, binder, view, viewFactory, createdChildViews, eventHandler;

    function createInjector(context = {}) {
      @Provide(View)
      function viewProvider(injector:Injector) {
        return new RootView(document.createElement('a'), injector, context);
      }

      use(viewProvider);

      inject(ViewFactory, Injector, View, EventHandler, (_viewFactory, _injector, _view, _eventHandler)=>{
        createdChildViews = [];
        viewFactory = _viewFactory;
        eventHandler = _eventHandler;
        var _createChildView = viewFactory.createChildView;
        viewFactory.createChildView = function() {
          var view = _createChildView.apply(this, arguments);
          createdChildViews.push(view);
          return view;
        }
        spyOn(viewFactory, 'createChildView').and.callThrough();
        spyOn(viewFactory, 'createRootView').and.callThrough();
        view = _view;
        injector = _injector;
        spyOn(eventHandler, 'install');
      })
    }

    describe('_bindNodeBasic', ()=>{
      var node, childInjector;

      function createInjectorAndInit({attrs = null, directives = [], diProviders = [], context = {}}) {
        createInjector(context);
        init({attrs, directives, diProviders});
      }

      function init({attrs = null, directives = [], diProviders = []}) {
        attrs = attrs || {};
        attrs.init = attrs.init || {};
        attrs.bind = attrs.bind || {};
        attrs.event = attrs.event || {};

        binder = {attrs: attrs};
        node = $('<div></div>')[0];
        childInjector = viewFactory._bindNodeBasic({binder, injector, node, diProviders, directiveClasses:directives});
      }

      it('should create a child injector', ()=>{
        createInjectorAndInit({});
        expect(childInjector.parent).toBe(injector);
      });

      it('should provide the ngNode via DI', () => {
        createInjectorAndInit({});
        expect(childInjector.get(NgNode).nativeNode).toBe(node);
      });

      it('should create a new instances of the directives in the binder', ()=>{
        @DecoratorDirective()
        class SomeDirective {
        }
        createInjector();
        var parentDirective = injector.get(SomeDirective);
        init({
          directives: [SomeDirective]
        });
        expect(childInjector.get(SomeDirective)).not.toBe(parentDirective);
      });

      it('should not create a new instances of directives not in the binder', ()=>{
        @DecoratorDirective()
        class SomeDirective {
        }
        createInjector();
        var parentDirective = injector.get(SomeDirective);
        init({
          directives: []
        });
        expect(childInjector.get(SomeDirective)).toBe(parentDirective);
      });

      it('should save the injector and the directive instances on the ngNode', ()=>{
        @DecoratorDirective()
        class SomeDirective {
        }

        createInjectorAndInit({
          directives: [SomeDirective]
        });

        var ngNode = node.ngNode;
        expect(ngNode.data.injector).toBe(childInjector);
        expect(ngNode.data.directives).toEqual([childInjector.get(SomeDirective)]);
      });

      describe('"observe" in directive annotation', ()=>{

        it('should call the method when the expression changed', ()=>{
          var receivedProp;
          @DecoratorDirective({ observe: {'someProp+"Test"': 'somePropChanged' }})
          class SomeDirective {
            somePropChanged(value) {
              receivedProp = value;
            }
          }
          createInjectorAndInit({
            directives: [SomeDirective]
          });

          var directiveInstance = childInjector.get(SomeDirective);
          directiveInstance.someProp = '1';
          view.digest();
          expect(receivedProp).toBe('1Test');
          directiveInstance.someProp = '2';
          view.digest();
          expect(receivedProp).toBe('2Test');
        });

      });

      describe('"bind" in directive annotation', ()=>{
        var directiveInstance;

        @DecoratorDirective({bind: {'someNodeProp': 'dir.someProp'}})
        class SomeDirective {
          constructor() {
            this.dir = {};
          }
        }

        it('should update the directive when the node changes', ()=>{
          createInjectorAndInit({
            directives: [SomeDirective]
          });
          directiveInstance = childInjector.get(SomeDirective);

          node.ngNode.someNodeProp = 'someValue';
          expect(directiveInstance.dir.someProp).toBe('someValue');
        });

        it('should update the node when the directive changes', ()=>{
          createInjectorAndInit({
            directives: [SomeDirective]
          });
          directiveInstance = childInjector.get(SomeDirective);

          directiveInstance.dir.someProp = 'someValue';
          view.digest();
          expect(node.ngNode.someNodeProp).toBe('someValue');
        });

        it('should initialize observed nodes with the attribute value', ()=>{
          createInjectorAndInit({
            directives: [SomeDirective],
            attrs: {
              init: {
                'someNodeProp': 'someValue'
              }
            }
          });
          directiveInstance = childInjector.get(SomeDirective);

          expect(directiveInstance.dir.someProp).toBe('someValue');
          expect(node.ngNode.someNodeProp).toBe('someValue');
        });

      });

      describe('"bind-*" in attribute', () => {

        it('should update the ngNode when the expression changes', ()=>{
          createInjectorAndInit({
            attrs: {
              bind: { 'someNodeProp': 'someCtxProp' }
            }
          });

          view.executionContext.someCtxProp = 'someValue';
          view.digest();
          expect(node.ngNode.someNodeProp).toBe('someValue');
          expect(view.executionContext.someCtxProp).toBe('someValue');
        });

        it('should update the expression when ngNode changes', ()=>{
          createInjectorAndInit({
            attrs: {
              bind: { 'someNodeProp': 'someCtxProp' }
            }
          });
          node.ngNode.someNodeProp = 'someValue';

          expect(node.ngNode.someNodeProp).toBe('someValue');
          expect(view.executionContext.someCtxProp).toBe('someValue');
        });

        it('should initialize the ngNode from the execution context', ()=>{
          createInjectorAndInit({
            attrs: {
              bind: {
                'someNodeProp': 'someCtxProp'
              },
              init: {
                'someNodeProp': 'someNodeInitValue'
              }
            },
            context: { someCtxProp: 'someExecInitValue' }
          });

          expect(node.ngNode.someNodeProp).toBe('someExecInitValue');
          expect(view.executionContext.someCtxProp).toBe('someExecInitValue');
        });
      });

      describe('"on" in directive annotation', ()=>{
        var directiveInstance;

        @DecoratorDirective({on: {'someEvent': 'someExpression'}})
        class SomeDirective {}

        it('should add a handler to ngNode.data.events', ()=>{
          createInjectorAndInit({
            directives: [SomeDirective]
          });
          directiveInstance = childInjector.get(SomeDirective);

          var ngNode = childInjector.get(NgNode);
          expect(ngNode.data.events.someEvent.length).toBe(1);
          spyOn(view, 'evaluate');
          ngNode.data.events.someEvent[0]();
          expect(view.evaluate).toHaveBeenCalledWith('someExpression', directiveInstance);
        });

      });

      describe('"on-*"" in attribute', ()=>{

        it('should add a handler to ngNode.data.events', ()=>{
          createInjectorAndInit({
            attrs: {
              on: {
                'someEvent': 'someExpression'
              }
            }
          });
          var ngNode = childInjector.get(NgNode);
          expect(ngNode.data.events.someEvent.length).toBe(1);
          spyOn(view, 'evaluate');
          ngNode.data.events.someEvent[0]();
          expect(view.evaluate).toHaveBeenCalledWith('someExpression', view.executionContext);
        });

      });

    });

    describe('bindElement', ()=>{
      var element, childInjector;

      function init({decorators = [], component = null, context = {}, innerHTML = ''}) {
        binder = {
          attrs: {
            bind: {},
            init: {}
          },
          events: null,
          decorators: decorators,
          component: component,
          nonElementBinders: [],
          level: -1
        };
        element = $('<div></div>')[0];
        element.innerHTML = innerHTML;
        element.shadowRoot = document.createElement('div');
        element.createShadowRoot = jasmine.createSpy('createShadowRoot').and.returnValue(element.shadowRoot);
        createInjector(context);
        childInjector = viewFactory._bindElement(binder, injector, element);
      }

      function createElementAndBinder(binderData) {
        binder = new ElementBinder(binderData);
        element = $('<div></div>')[0];
        element.shadowRoot = document.createElement('div');
        element.createShadowRoot = jasmine.createSpy('createShadowRoot').and.returnValue(element.shadowRoot);
      }

      describe('decorator directives', ()=>{

        it('should create a new directive instance', () => {
          var createdInstance;
          @DecoratorDirective()
          class SomeDirective {
            constructor() {
              createdInstance = this;
            }
          }
          init({
            decorators: [
              SomeDirective
            ]
          });

          expect(createdInstance).toBeTruthy();
        });
      });

      describe('component directives', ()=>{
        var createdInstance,
           container,
           compiledTemplate,
           templatePromise,
           SomeDirective,
           SomeShadowDomDirective;

        beforeEach(()=>{
          container = $('<div>a</div>')[0];
          compiledTemplate = {
            container: container,
            binders: []
          };
          templatePromise = {
            then: function(callback) {
              callback({
                template: compiledTemplate
              });
            }
          };

          @ComponentDirective({template: templatePromise})
          class SomeDirective_ {
            constructor() {
              createdInstance = this;
            }
          }
          @ComponentDirective({template: templatePromise, shadowDOM: true})
          class SomeShadowDomDirective_ {
            constructor() {
              createdInstance = this;
            }
          }
          SomeDirective = SomeDirective_;
          SomeShadowDomDirective = SomeShadowDomDirective_;
        });

        it('should create a new directive instance', () => {
          init({
            component: SomeDirective
          });

          expect(createdInstance).toBeTruthy();
        });

        it('should append the template to the ShadowDOM for shadowDOM directives', () => {
          var contentHtml = '<span id="outer"></span>';
          init({
            component: SomeShadowDomDirective,
            innerHTML: contentHtml
          });

          expect(element.shadowRoot.innerHTML).toBe($html(container.childNodes));
          expect(element.innerHTML).toBe(contentHtml);
        });

        it('should append the template to the element for non shadowDOM directives', () => {
          var contentHtml = '<span id="outer"></span>';
          init({
            component: SomeDirective,
            innerHTML: contentHtml
          });

          expect(element.innerHTML).toBe($html(container.childNodes));
        });

        it('should create a new View with the component instance as execution context', () => {
          init({
            component: SomeDirective
          });
          expect(viewFactory.createChildView).toHaveBeenCalledWith({
            parentView: view,
            executionContext: childInjector.get(SomeDirective),
            template: compiledTemplate
          });
        });

        it('should install the event handler for components', ()=>{
          compiledTemplate.binders = createBinders([0,1]);
          compiledTemplate.binders[1].attrs.on['event1'] = 'someExpression';
          compiledTemplate.container = $('<div><a class="ng-binder"></a></div>')[0];

          init({
            component: SomeDirective
          });
          var compView = createdChildViews[0];
          expect(eventHandler.install).toHaveBeenCalledWith(compView.nodes, ['event1']);
        });

        it('should cache the compiled template from the promise', ()=>{
          spyOn(templatePromise, 'then').and.callThrough();
          init({
            component: SomeDirective
          });

          viewFactory.createChildView.calls.reset();
          templatePromise.then.calls.reset();
          viewFactory._bindElement(binder, injector, element);

          expect(templatePromise.then).not.toHaveBeenCalled();
          expect(viewFactory.createChildView).toHaveBeenCalledWith({
            parentView: view,
            executionContext: childInjector.get(SomeDirective),
            template: compiledTemplate
          });
        });

        // TODO: Error case (reject of templatePromise): log the error via the logger
        // TODO: Which logger to use?

      });

    });

    describe('initNonElement', () => {
      var node, compiledTemplate, createdInstance, childInjector;

      function init({template = null}) {
        node = document.createComment('comment');
        binder = {
          template: template,
          attrs: {
            init: {},
            bind: {}
          },
          events: null,
          indexInParent: -1
        };
        createInjector();
        inject(ViewFactory, (viewFactory)=>{
          childInjector = viewFactory._bindNonElement(binder, injector, node);
        });
      }

      beforeEach(()=>{
        compiledTemplate = {
          container: $('<div>a</div>')[0],
          binders: []
        };
      });

      @TemplateDirective
      class SomeDirective {
        constructor() {
          createdInstance = this;
        }
      }

      function createCommentAndNonElementBinder(data) {
        node = document.createComment('comment');
        binder = new NonElementBinder(data);
      }

      describe('tempate directives', () => {
        it('should create a new directive instance', () => {
          init({
            template: {
              directive: SomeDirective,
              compiledTemplate: compiledTemplate
            }
          });

          expect(createdInstance).toBeTruthy();
        });

        it('should provide the BoundViewFactory and ViewPort via DI', () => {
          init({
            template: {
              directive: SomeDirective,
              compiledTemplate: compiledTemplate
            }
          });

          expect(childInjector.get(ViewPort)).toEqual(new ViewPort(node));
          var boundViewFactory = childInjector.get(BoundViewFactory);
          expect(boundViewFactory.viewFactory).toBe(viewFactory);
          expect(boundViewFactory.template).toBe(compiledTemplate);
        });
      });
    });

  });
});
