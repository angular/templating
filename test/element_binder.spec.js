import {DecoratorDirective, TemplateDirective, ComponentDirective, EXECUTION_CONTEXT} from '../src/annotations';
import {ViewPort, View, RootView} from '../src/view';
import {ViewFactory, ElementBinder, NonElementBinder} from '../src/view_factory';
import {Injector} from 'di';
import {Inject, Provide} from 'di';
import {EventHandler} from '../src/event_handler';
import {NodeAttrs} from '../src/types';
import {$, $html} from './dom_mocks';
import {NgNode} from '../src/ng_node';

var injector,
  binder,
  view;

describe('ElementBinder', ()=>{
  var element;

  function createElementAndBinder(binderData) {
    binder = new ElementBinder(binderData);
    element = $('<div></div>')[0];
    element.shadowRoot = document.createElement('div');
    element.createShadowRoot = jasmine.createSpy('createShadowRoot').and.returnValue(element.shadowRoot);
  }

  it('should create a child injector', ()=>{
    createInjector();
    createElementAndBinder();
    var childInjector = binder.bind(injector, element);
    expect(childInjector.parent).toBe(injector);
  });

  describe('generic behavior', ()=>{
    it('should provide the ngNode via DI', () => {
      createInjector();
      createElementAndBinder({});

      var childInjector = binder.bind(injector, element);
      expect(childInjector.get(NgNode).nativeNode()).toBe(element);
    });

    it('should save the injector and the directive instances on the ngNode', ()=>{
      @DecoratorDirective
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          SomeDirective
        ]
      });

      var childInjector = binder.bind(injector, element);
      var ngNode = element.ngNode;
      expect(ngNode.data().injector).toBe(childInjector);
      expect(ngNode.data().directives).toEqual([childInjector.get(SomeDirective)]);
    });

    it('should add exported properties of directives to the element and not cache them in the ngNode', ()=>{      
      @DecoratorDirective({exports: ['someProp']})
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          SomeDirective
        ]
      });

      var childInjector = binder.bind(injector, element);
      var directiveInstance = childInjector.get(SomeDirective);
      directiveInstance.someProp = 'someValue';
      expect(element.someProp).toBe('someValue');
      expect(element.ngNode.prop('someProp')).toBe('someValue');
      element.someProp = 'anotherValue';
      expect(directiveInstance.someProp).toBe('anotherValue');
      // Not caching on the ngNode
      // is important so that we don't get into digest cycles between digest and flush!
      expect(element.ngNode.prop('someProp')).toBe('anotherValue');
    });

    it('should not overwrite existing properties when exporting properties of directives', ()=>{      
      @DecoratorDirective({exports: ['nodeValue']})
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          SomeDirective
        ]
      });

      expect( ()=>{ binder.bind(injector, element); } ).toThrow();
    });

    it('should initialize exported properties with the attribute value', ()=>{
      @DecoratorDirective({exports: ['someProp']})
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          SomeDirective
        ],
        attrs: new NodeAttrs({
          init: {
            'someProp': 'someValue'
          }
        })
      });

      var childInjector = binder.bind(injector, element);
      var directiveInstance = childInjector.get(SomeDirective);
      expect(directiveInstance.someProp).toBe('someValue');
      expect(element.someProp).toBe('someValue');
    });

    describe('data binding', () => {
      beforeEach(()=>{
        createInjector();
        var nodeAttrs = new NodeAttrs({
          bind: {
            'someNodeProp': 'someCtxProp'
          }
        });
        createElementAndBinder({
          attrs: nodeAttrs
        });
      });

      it('should update the ngNode when the epxression changes', ()=>{
        binder.bind(injector, element);
        view.watchGrp.detectChanges();

        view.executionContext.someCtxProp = 'someValue';
        view.watchGrp.detectChanges();
        expect(element.ngNode.prop('someNodeProp')).toBe('someValue');
        expect(view.executionContext.someCtxProp).toBe('someValue');
      });

      it('should update the expression when ngNode changes', ()=>{
        binder.bind(injector, element);
        view.watchGrp.detectChanges();

        element.ngNode.prop('someNodeProp', 'someValue');
        
        view.watchGrp.detectChanges();
        expect(element.ngNode.prop('someNodeProp')).toBe('someValue');
        expect(view.executionContext.someCtxProp).toBe('someValue');
      });

      it('should not update the ngNode in later digests when ngNode changes', ()=>{
        binder.bind(injector, element);
        view.watchGrp.detectChanges();

        element.ngNode.prop('someNodeProp', 'someValue');
        element.ngNode.flush();
        
        view.watchGrp.detectChanges();        
        view.watchGrp.detectChanges();

        expect(element.ngNode.isDirty()).toBe(false);
      });

      it('should let changes in the view win over changes in the element', ()=>{
        binder.bind(injector, element);

        // first digest
        element.ngNode.prop('someNodeProp', 'a1');
        view.executionContext.someCtxProp = 'b1';
        view.digest();
        expect(element.ngNode.prop('someNodeProp')).toBe('b1');
        expect(view.executionContext.someCtxProp).toBe('b1');

        // fruther digests
        element.ngNode.prop('someNodeProp', 'a2');
        view.executionContext.someCtxProp = 'b2';
        view.digest();
        expect(element.ngNode.prop('someNodeProp')).toBe('b2');
        expect(view.executionContext.someCtxProp).toBe('b2');
      });

    });

    it('should initialize event handling', ()=>{
      createInjector();
      var nodeAttrs = new NodeAttrs({
        event: {
          'click': 'someExpr'
        }
      });
      createElementAndBinder({
        attrs: nodeAttrs
      });
      spyOn(EventHandler.prototype, 'listen');

      binder.bind(injector, element);
      expect(EventHandler.prototype.listen).toHaveBeenCalledWith(element, 'click', 'someExpr');

    });
  });

  describe('decorator directives', ()=>{

    it('should create a new directive instance', () => {
      var createdInstance;
      @DecoratorDirective()
      class SomeDirective {
        constructor() {
          createdInstance = this;          
        }
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          SomeDirective
        ]
      });

      binder.bind(injector, element);
      expect(createdInstance).toBeTruthy();
    });
  });

  describe('component directives', ()=>{
    var createdInstance,
       container,
       viewFactory,
       viewFactoryPromise,
       SomeDirective;
    beforeEach(()=>{
      container = $('<div>a</div>')[0];
      viewFactory = new ViewFactory(container, []);
      viewFactoryPromise = {
        then: function(callback) {
          callback(viewFactory);
        }
      };
      createInjector();

      @ComponentDirective({template: viewFactoryPromise})
      class SomeDirective_ {
        constructor() {
          createdInstance = this;          
        }
      }
      SomeDirective = SomeDirective_;
    });

    it('should create a new directive instance', () => {
      createElementAndBinder({
        component: SomeDirective
      });

      binder.bind(injector, element);
      expect(createdInstance).toBeTruthy();
    });

    it('should append the template to the ShadowDOM', () => {
      createElementAndBinder({
        component: SomeDirective
      });
      var contentHtml = element.innerHTML = '<span id="outer"></span>';

      binder.bind(injector, element);
      expect(element.shadowRoot.innerHTML).toBe($html(container.childNodes));
      expect(element.innerHTML).toBe(contentHtml);        
    });

    it('should call the viewFactory with the component instance as execution context', () => {
      spyOn(viewFactory, 'createChildView').and.callThrough();

      createElementAndBinder({
        component: SomeDirective
      });
      var childInjector = binder.bind(injector, element);

      expect(viewFactory.createChildView).toHaveBeenCalledWith(childInjector, childInjector.get(SomeDirective));
    });

    // TODO: Error case (reject of viewFactoryPromise): log the error via the logger
    // TODO: Which logger to use?

  });

});

describe('NonElementBinder', () => {
  var node;

  function createCommentAndNonElementBinder(data) {
    node = document.createComment('comment');
    binder = new NonElementBinder(data);
  }

  describe('generic behavior', ()=>{
    it('should create a child injector', ()=>{
      createInjector();
      createCommentAndNonElementBinder();
      var childInjector = binder.bind(injector, node);
      expect(childInjector.parent).toBe(injector);
    });

    it('should provide the ngNode via DI', () => {
      createInjector();
      createCommentAndNonElementBinder();

      var childInjector = binder.bind(injector, node);
      expect(childInjector.get(NgNode).nativeNode()).toBe(node);
    });

    it('should initialize data binding handling', ()=>{
      createInjector();
      var nodeAttrs = new NodeAttrs({
        bind: {
          'someNodeProp': 'someCtxProp'
        }
      });
      createCommentAndNonElementBinder({
        attrs: nodeAttrs
      });

      binder.bind(injector, node);

      view.executionContext.someCtxProp = '1';
      view.digest();
      expect(node.ngNode.prop('someNodeProp')).toBe('1');
      expect(view.executionContext.someCtxProp).toBe('1');

      view.executionContext.someCtxProp = '2';
      view.digest();
      expect(node.ngNode.prop('someNodeProp')).toBe('2');
      expect(view.executionContext.someCtxProp).toBe('2');

      node.ngNode.prop('someNodeProp', '3');
      view.digest();
      expect(node.ngNode.prop('someNodeProp')).toBe('3');
      expect(view.executionContext.someCtxProp).toBe('3');

      // We assume that NonElementBinder and ElementBinder share a common
      // implementatin for setting up the databinding,
      // so we don't test the other test cases again here.
      // See the test cases for ElementBinder above.
    });

    it('should initialize event handling', ()=>{
      createInjector();
      var nodeAttrs = new NodeAttrs({
        event: {
          'click': 'someExpr'
        }
      });
      createCommentAndNonElementBinder({
        attrs: nodeAttrs
      });
      spyOn(EventHandler.prototype, 'listen');

      binder.bind(injector, node);
      expect(EventHandler.prototype.listen).toHaveBeenCalledWith(node, 'click', 'someExpr');

    });
  });

  describe('tempate directives', () => {
    var createdInstance,
       viewFactory;
    beforeEach(()=>{
      viewFactory = new ViewFactory($('<div>a</div>')[0], null);
      createInjector();
    });

    it('should create a new directive instance', () => {
      @TemplateDirective
      class SomeDirective {
        constructor() {
          createdInstance = this;          
        }
      }
      createCommentAndNonElementBinder({
        template: {
          directive: SomeDirective,
          viewFactory: viewFactory
        }
      });

      binder.bind(injector, node);
      expect(createdInstance).toBeTruthy();
    });

    it('should add exported properties of the directive to the node', ()=>{      
      @TemplateDirective({exports: ['someProp']})
      class SomeDirective {
        constructor() {
          createdInstance = this;          
        }
      }
      createCommentAndNonElementBinder({
        template: {
          directive: SomeDirective,
          viewFactory: viewFactory
        }
      });

      binder.bind(injector, node);

      createdInstance.someProp = 'someValue';
      expect(node.someProp).toBe('someValue');
      node.someProp = 'anotherValue';
      expect(createdInstance.someProp).toBe('anotherValue');
    });

    it('should initialize exported properties with the attribute value', ()=>{      
      @TemplateDirective({exports: ['someProp']})
      class SomeDirective {
        constructor() {
          createdInstance = this;          
        }
      }
      createCommentAndNonElementBinder({
        template: {
          directive: SomeDirective,
          viewFactory: viewFactory
        },
        attrs: new NodeAttrs({
          init: {
            someProp: 'someValue'
          }
        })
      });

      binder.bind(injector, node);

      expect(node.someProp).toBe('someValue');
      expect(createdInstance.someProp).toBe('someValue');
    });

    it('should provide the ViewFactory and ViewPort via DI', () => {
      @TemplateDirective
      class SomeDirective {
      }
      createCommentAndNonElementBinder({
        template: {
          directive: SomeDirective,
          viewFactory: viewFactory
        }
      });

      var childBinder = binder.bind(injector, node);
      expect(childBinder.get(ViewPort)).toEqual(new ViewPort(node));
      expect(childBinder.get(ViewFactory)).toBe(viewFactory);
    });
  });
});

function createInjector() {
  @Provide(View)
  function viewProvider(injector:Injector) {
    return new RootView(document.createElement('a'), injector);
  }

  injector = new Injector([viewProvider]);
  view = injector.get(View);
}

