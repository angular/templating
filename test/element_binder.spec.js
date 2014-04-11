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
  var node;

  function createNodeAndBinder({attrs = null, directives = [], diProviders = []}) {
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
    binder = new BinderClass({attrs: attrs});
    node = $('<div></div>')[0];
  }

  it('should create a child injector', ()=>{
    createInjector();
    createNodeAndBinder({});
    var childInjector = binder.bind(injector, node);
    expect(childInjector.parent).toBe(injector);
  });

  it('should provide the ngNode via DI', () => {
    createInjector();
    createNodeAndBinder({});

    var childInjector = binder.bind(injector, node);
    expect(childInjector.get(NgNode).nativeNode).toBe(node);
  });

  it('should save the injector and the directive instances on the ngNode', ()=>{
    @DecoratorDirective()
    class SomeDirective {
    }

    createInjector();
    createNodeAndBinder({
      directives: [SomeDirective]
    });

    var childInjector = binder.bind(injector, node);
    var ngNode = node.ngNode;
    expect(ngNode.data.injector).toBe(childInjector);
    expect(ngNode.data.directives).toEqual([childInjector.get(SomeDirective)]);
  });

  it('should observe properties', ()=>{
    @DecoratorDirective({observe: ['someProp']})
    class SomeDirective {
      somePropChanged(value) {
        this.someProp = value;
      }
    }
    createInjector();
    createNodeAndBinder({
      directives: [SomeDirective]
    });

    var childInjector = binder.bind(injector, node);
    var directiveInstance = childInjector.get(SomeDirective);
    node.ngNode.someProp = 'someNewValue';
    expect(directiveInstance.someProp).toBe('someNewValue');
  });

  it('should initialize observed properties with the attribute value', ()=>{
    @DecoratorDirective({observe: ['someProp']})
    class SomeDirective {
      somePropChanged(value) {
        this.someProp = value;
      }
    }
    createInjector();
    createNodeAndBinder({
      directives: [SomeDirective],
      attrs: new NodeAttrs({
        init: {
          'someProp': 'someValue'
        }
      })
    });

    var childInjector = binder.bind(injector, node);
    var directiveInstance = childInjector.get(SomeDirective);
    expect(directiveInstance.someProp).toBe('someValue');
    expect(node.ngNode.someProp).toBe('someValue');
  });

  describe('data binding', () => {
    beforeEach(()=>{
      createInjector();
      var nodeAttrs = new NodeAttrs({
        bind: {
          'someNodeProp': 'someCtxProp'
        }
      });
      createNodeAndBinder({
        attrs: nodeAttrs
      });
    });

    it('should update the ngNode when the expression changes', ()=>{
      binder.bind(injector, node);
      view.watchGrp.detectChanges();

      view.executionContext.someCtxProp = 'someValue';
      view.watchGrp.detectChanges();
      expect(node.ngNode.someNodeProp).toBe('someValue');
      expect(view.executionContext.someCtxProp).toBe('someValue');
    });

    it('should update the expression when ngNode changes', ()=>{
      node.someNodeProp = '';
      binder.bind(injector, node);
      node.ngNode.someNodeProp = 'someValue';

      expect(node.ngNode.someNodeProp).toBe('someValue');
      expect(view.executionContext.someCtxProp).toBe('someValue');
    });

  });

  it('should initialize event handling', ()=>{
    createInjector();
    var nodeAttrs = new NodeAttrs({
      event: {
        'click': 'someExpr'
      }
    });
    createNodeAndBinder({
      attrs: nodeAttrs
    });
    spyOn(EventHandler.prototype, 'listen');

    binder.bind(injector, node);
    expect(EventHandler.prototype.listen).toHaveBeenCalledWith(node, 'click', 'someExpr');

  });

});

describe('ElementBinder', ()=>{
  var element;

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
          callback({
            viewFactory: viewFactory
          });
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

