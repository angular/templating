import {DirectiveClass} from '../src/directive_class';
import {DecoratorDirective, TemplateDirective, ComponentDirective, EXECUTION_CONTEXT} from '../src/annotations';
import {ViewPort} from '../src/view';
import {ViewFactory, ElementBinder, NonElementBinder} from '../src/view_factory';
import {Injector} from 'di/injector';
import {Inject, Provide} from 'di/annotations';
import {EventHandler} from '../src/event_handler';
import {ObjectObserver} from '../src/object_observer';
import {NodeAttrs} from '../src/types';
import {$, $html} from './dom_mocks';

var injector,
  binder,
  executionContext;

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
    it('should provide the html element via DI', () => {
      createInjector();
      createElementAndBinder({});

      var childInjector = binder.bind(injector, element);
      expect(childInjector.get(Node)).toBe(element);
    });

    it('should initialize data binding handling', ()=>{
      createInjector();
      var nodeAttrs = new NodeAttrs({
        bind: {
          'value': 'someExpr'
        },
        init: {
          'value': 'someInit'
        }
      });
      createElementAndBinder({
        attrs: nodeAttrs
      });
      spyOn(ObjectObserver.prototype, 'bindNode');

      binder.bind(injector, element);
      expect(ObjectObserver.prototype.bindNode).toHaveBeenCalledWith('someExpr', 'someInit', element, [], 'value')
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
       templateNodes,
       viewFactory;
    class SomeDirective {
      constructor() {
        createdInstance = this;          
      }
    }
    beforeEach(()=>{
      templateNodes = $('a');
      viewFactory = new ViewFactory(templateNodes, []);
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
      expect(element.shadowRoot.innerHTML).toBe($html(templateNodes));
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

    it('should provide the html element via DI', () => {
      createInjector();
      createCommentAndNonElementBinder();

      var childInjector = binder.bind(injector, node);
      expect(childInjector.get(Node)).toBe(node);
    });

    it('should initialize data binding handling', ()=>{
      createInjector();
      var nodeAttrs = new NodeAttrs({
        bind: {
          'value': 'someExpr'
        },
        init: {
          'value': 'someInit'
        }
      });
      createCommentAndNonElementBinder({
        attrs: nodeAttrs
      });
      spyOn(ObjectObserver.prototype, 'bindNode');

      binder.bind(injector, node);
      expect(ObjectObserver.prototype.bindNode).toHaveBeenCalledWith('someExpr', 'someInit', node, [], 'value')
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
       templateNodes,
       viewFactory;
    class SomeDirective {
      constructor() {
        createdInstance = this;          
      }
    }
    beforeEach(()=>{
      templateNodes = $('a');
      viewFactory = new ViewFactory(templateNodes, null);
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
  executionContext = {};

  @Provide(EXECUTION_CONTEXT)
  function executionContextProvider() {
    return executionContext;
  }

  // TODO inject executionContext into the Injector
  injector = new Injector([executionContextProvider]);
}

