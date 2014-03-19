import {DirectiveClass} from '../src/directive_class';
import {DecoratorDirective, TemplateDirective, ComponentDirective, EXECUTION_CONTEXT} from '../src/annotations';
import {ViewPort, View} from '../src/view';
import {ViewFactory, ElementBinder, NonElementBinder} from '../src/view_factory';
import {Injector} from 'di/injector';
import {Inject, Provide} from 'di/annotations';
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
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          new DirectiveClass(new DecoratorDirective(), SomeDirective)
        ]
      });

      var childInjector = binder.bind(injector, element);
      var ngNode = element.ngNode;
      expect(ngNode.data().injector).toBe(childInjector);
      expect(ngNode.data().directives).toEqual([childInjector.get(SomeDirective)]);
    });

    it('should add exported properties of directives to the element', ()=>{      
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          new DirectiveClass(new DecoratorDirective({exports: ['someProp']}), SomeDirective)
        ]
      });

      var childInjector = binder.bind(injector, element);
      var directiveInstance = childInjector.get(SomeDirective);
      directiveInstance.someProp = 'someValue';
      expect(element.someProp).toBe('someValue');
      element.someProp = 'anotherValue';
      expect(directiveInstance.someProp).toBe('anotherValue');
    });

    it('should not overwrite existing properties when exporting properties of directives', ()=>{      
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          new DirectiveClass(new DecoratorDirective({exports: ['nodeValue']}), SomeDirective)
        ]
      });

      expect( () => {binder.bind(injector, element);}).toThrow();
    });

    it('should initialize exported properties with the attribute value', ()=>{
      class SomeDirective {
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          new DirectiveClass(new DecoratorDirective({exports: ['someProp']}), SomeDirective)
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
      var watchCalls, watchExprCallback, watchPropCallback;
      beforeEach(()=>{
        createInjector();
        var nodeAttrs = new NodeAttrs({
          bind: {
            'someProp': 'someExpr'
          }
        });
        createElementAndBinder({
          attrs: nodeAttrs
        });
        spyOn(view, 'watch');
        spyOn(view, 'assign');
        binder.bind(injector, element);
        spyOn(element.ngNode, 'prop');

        watchCalls = view.watch.calls;
        watchExprCallback = watchCalls.argsFor(0)[1];
        watchPropCallback = watchCalls.argsFor(1)[1];
      });

      it('should initialize data binding', ()=>{
        expect(watchCalls.count()).toBe(2);
        // watch the expression on the execution context
        expect(watchCalls.argsFor(0)[0]).toBe('someExpr');
        expect(watchCalls.argsFor(0)[2]).toBe(view.executionContext);
        // watch the property on the ngNode
        expect(watchCalls.argsFor(1)[0]).toBe('prop("someProp")');
        expect(watchCalls.argsFor(1)[2]).toBe(element.ngNode);
      });

      it('should update the ngNode when the epxression changes', ()=>{
        watchExprCallback('someValue');
        expect(element.ngNode.prop).toHaveBeenCalledWith('someProp', 'someValue');
      });

      it('should update the expression when ngNode changes', ()=>{
        watchPropCallback('someValue');
        expect(view.assign).toHaveBeenCalledWith('someExpr', 'someValue', view.executionContext);
      });

      it('should not update the expression when ngNode changes after an expression change', ()=>{
        watchExprCallback('someValue');
        watchPropCallback('someValue');
        expect(view.assign).not.toHaveBeenCalled();
      });

      it('should not update the ngNode when the expression changes after an ngNode change', ()=>{
        watchPropCallback('someValue');
        watchExprCallback('someValue');
        expect(element.ngNode.prop).not.toHaveBeenCalled();
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
      class SomeDirective {
        constructor() {
          createdInstance = this;          
        }
      }
      createInjector();
      createElementAndBinder({
        decorators: [
          new DirectiveClass(new DecoratorDirective(), SomeDirective)
        ]
      });

      binder.bind(injector, element);
      expect(createdInstance).toBeTruthy();
    });
  });

  describe('component directives', ()=>{
    var createdInstance,
       container,
       viewFactory;
    class SomeDirective {
      constructor() {
        createdInstance = this;          
      }
    }
    beforeEach(()=>{
      container = $('<div>a</div>')[0];
      viewFactory = new ViewFactory(container, []);
      createInjector();
    });

    it('should create a new directive instance', () => {
      createElementAndBinder({
        component: {
          directive: new DirectiveClass(new ComponentDirective(), SomeDirective),
          viewFactory: viewFactory
        }
      });

      binder.bind(injector, element);
      expect(createdInstance).toBeTruthy();
    });

    it('should append the template to the ShadowDOM', () => {
      createElementAndBinder({
        component: {
          directive: new DirectiveClass(new ComponentDirective(), SomeDirective),
          viewFactory: viewFactory
        }
      });
      var contentHtml = element.innerHTML = '<span id="outer"></span>';

      binder.bind(injector, element);
      expect(element.shadowRoot.innerHTML).toBe($html(container.childNodes));
      expect(element.innerHTML).toBe(contentHtml);        
    });

    it('should call the viewFactory with the component instance as execution context', () => {
      spyOn(viewFactory, 'createView').and.callThrough();

      createElementAndBinder({
        component: {
          directive: new DirectiveClass(new ComponentDirective(), SomeDirective),
          viewFactory: viewFactory
        }
      });
      var childInjector = binder.bind(injector, element);

      expect(viewFactory.createView).toHaveBeenCalledWith(childInjector, childInjector.get(SomeDirective));
    });

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
          'someProp': 'someExpr'
        }
      });
      createCommentAndNonElementBinder({
        attrs: nodeAttrs
      });
      spyOn(view, 'watch');

      binder.bind(injector, node);
      var watchCalls = view.watch.calls;
      expect(watchCalls.count()).toBe(2);
      // watch the expression on the execution context
      expect(watchCalls.argsFor(0)[0]).toBe('someExpr');
      expect(watchCalls.argsFor(0)[2]).toBe(view.executionContext);
      // watch the property on the ngNode
      expect(watchCalls.argsFor(1)[0]).toBe('prop("someProp")');
      expect(watchCalls.argsFor(1)[2]).toBe(node.ngNode);

      // We assume that NonElementBinder and ElementBinder share a common
      // implementatin for setting up the databinding,
      // so we don't test the runtime test cases again here.
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
    class SomeDirective {
      constructor() {
        createdInstance = this;          
      }
    }
    beforeEach(()=>{
      viewFactory = new ViewFactory($('<div>a</div>')[0], null);
      createInjector();
    });

    it('should create a new directive instance', () => {
      createCommentAndNonElementBinder({
        template: {
          directive: new DirectiveClass(new TemplateDirective(), SomeDirective),
          viewFactory: viewFactory
        }
      });

      binder.bind(injector, node);
      expect(createdInstance).toBeTruthy();
    });

    it('should add exported properties of the directive to the node', ()=>{      
      createCommentAndNonElementBinder({
        template: {
          directive: new DirectiveClass(new TemplateDirective({exports: ['someProp']}), SomeDirective),
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
      createCommentAndNonElementBinder({
        template: {
          directive: new DirectiveClass(new TemplateDirective({exports: ['someProp']}), SomeDirective),
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
      createCommentAndNonElementBinder({
        template: {
          directive: new DirectiveClass(new TemplateDirective(), SomeDirective),
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
    return new View(document.createElement('a'), injector);
  }

  injector = new Injector([viewProvider]);
  view = injector.get(View);
}

