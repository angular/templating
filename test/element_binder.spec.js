import {DecoratorDirective, TemplateDirective, ComponentDirective, EXECUTION_CONTEXT} from '../src/annotations';
import {ViewPort, View, RootView} from '../src/view';
import {ViewFactory, ElementBinder, NonElementBinder, NodeBinder} from '../src/view_factory';
import {Injector} from 'di';
import {Inject, Provide} from 'di';
import {EventHandler} from '../src/event_handler';
import {NodeAttrs} from '../src/types';
import {$, $html} from './dom_mocks';
import {NgNode} from '../src/ng_node';

var injector,
  binder,
  view;

describe('NodeBinder', ()=>{
  var node, childInjector;

  function init({attrs = null, directives = [], diProviders = [], context = {}}) {
    class BinderClass extends NodeBinder {
      constructor(args) {
        super(args);
      }
      _collectDirectives(target) {
        target.push(...directives);
      }
      _collectDiProviders(target) {
        target.push(...diProviders);
      }
    }
    createInjector(context);
    var nodeAttrs = attrs ? new NodeAttrs(attrs) : null;
    binder = new BinderClass({attrs: nodeAttrs});
    node = $('<div></div>')[0];
    childInjector = binder.bind(injector, node);
  }

  it('should create a child injector', ()=>{
    init({});
    expect(childInjector.parent).toBe(injector);
  });

  it('should provide the ngNode via DI', () => {
    init({});
    expect(childInjector.get(NgNode).nativeNode).toBe(node);
  });

  it('should save the injector and the directive instances on the ngNode', ()=>{
    @DecoratorDirective()
    class SomeDirective {
    }

    init({
      directives: [SomeDirective]
    });

    var ngNode = node.ngNode;
    expect(ngNode.data.injector).toBe(childInjector);
    expect(ngNode.data.directives).toEqual([childInjector.get(SomeDirective)]);
  });

  describe('observe in directive annotation', ()=>{

    it('should call the method when the expression changed', ()=>{
      var receivedProp;
      @DecoratorDirective({ observe: {'someProp+"Test"': 'somePropChanged' }})
      class SomeDirective {
        somePropChanged(value) {
          receivedProp = value;
        }
      }
      init({
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

  describe('bind in directive annotation', ()=>{
    var directiveInstance;

    @DecoratorDirective({bind: {'someNodeProp': 'dir.someProp'}})
    class SomeDirective {
      constructor() {
        this.dir = {};
      }
    }

    it('should update the directive when the node changes', ()=>{
      init({
        directives: [SomeDirective]
      });
      directiveInstance = childInjector.get(SomeDirective);

      node.ngNode.someNodeProp = 'someValue';
      expect(directiveInstance.dir.someProp).toBe('someValue');
    });

    it('should update the node when the directive changes', ()=>{
      init({
        directives: [SomeDirective]
      });
      directiveInstance = childInjector.get(SomeDirective);

      directiveInstance.dir.someProp = 'someValue';
      view.digest();
      expect(node.ngNode.someNodeProp).toBe('someValue');
    });

    it('should initialize observed nodes with the attribute value', ()=>{
      init({
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

  describe('data binding', () => {

    it('should update the ngNode when the expression changes', ()=>{
      init({
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
      init({
        attrs: {
          bind: { 'someNodeProp': 'someCtxProp' }
        }
      });
      node.ngNode.someNodeProp = 'someValue';

      expect(node.ngNode.someNodeProp).toBe('someValue');
      expect(view.executionContext.someCtxProp).toBe('someValue');
    });

    it('should initialize the ngNode from the execution context', ()=>{
      init({
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

  it('should initialize event handling', ()=>{
    spyOn(EventHandler.prototype, 'listen');
    init({
      attrs: {
        event: { 'click': 'someExpr' }
      }
    })
    expect(EventHandler.prototype.listen).toHaveBeenCalledWith(node, 'click', 'someExpr');

  });

});

describe('ElementBinder', ()=>{
  var element, childInjector;

  function init({decorators = [], component = null, context = {}, innerHTML = ''}) {
    binder = new ElementBinder({
      decorators: decorators,
      component: component
    });
    element = $('<div></div>')[0];
    element.innerHTML = innerHTML;
    element.shadowRoot = document.createElement('div');
    element.createShadowRoot = jasmine.createSpy('createShadowRoot').and.returnValue(element.shadowRoot);
    createInjector(context);
    childInjector = binder.bind(injector, element);
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
       viewFactory,
       viewFactoryPromise,
       SomeDirective;

    beforeEach(()=>{
      container = $('<div>a</div>')[0];
      viewFactory = new ViewFactory(container, []);
      viewFactoryPromise = {
        then: function(callback) {
          callback({
            viewFactory: viewFactory
          });
        }
      };

      @ComponentDirective({template: viewFactoryPromise})
      class SomeDirective_ {
        constructor() {
          createdInstance = this;
        }
      }
      SomeDirective = SomeDirective_;
    });

    it('should create a new directive instance', () => {
      init({
        component: SomeDirective
      });

      expect(createdInstance).toBeTruthy();
    });

    it('should append the template to the ShadowDOM', () => {
      var contentHtml = '<span id="outer"></span>';
      init({
        component: SomeDirective,
        innerHTML: contentHtml
      });

      expect(element.shadowRoot.innerHTML).toBe($html(container.childNodes));
      expect(element.innerHTML).toBe(contentHtml);
    });

    it('should call the viewFactory with the component instance as execution context', () => {
      spyOn(viewFactory, 'createChildView').and.callThrough();

      init({
        component: SomeDirective
      });
      expect(viewFactory.createChildView).toHaveBeenCalledWith(
        childInjector,
        childInjector.get(SomeDirective)
      );
    });

    // TODO: Error case (reject of viewFactoryPromise): log the error via the logger
    // TODO: Which logger to use?

  });

});

describe('NonElementBinder', () => {
  var node, viewFactory, createdInstance, childInjector;

  function init({template = null}) {
    node = document.createComment('comment');
    binder = new NonElementBinder({
      template: template
    });
    createInjector();
    childInjector = binder.bind(injector, node);
  }

  beforeEach(()=>{
    viewFactory = new ViewFactory($('<div>a</div>')[0], null);
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
          viewFactory: viewFactory
        }
      });

      expect(createdInstance).toBeTruthy();
    });

    it('should provide the ViewFactory and ViewPort via DI', () => {
      init({
        template: {
          directive: SomeDirective,
          viewFactory: viewFactory
        }
      });

      expect(childInjector.get(ViewPort)).toEqual(new ViewPort(node));
      expect(childInjector.get(ViewFactory)).toBe(viewFactory);
    });
  });
});

function createInjector(context = {}) {
  @Provide(View)
  function viewProvider(injector:Injector) {
    return new RootView(document.createElement('a'), injector, context);
  }

  injector = new Injector([viewProvider]);
  view = injector.get(View);
}

