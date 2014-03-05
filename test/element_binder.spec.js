import {DirectiveClass} from '../src/directive_class';
import {ElementBinderImpl} from '../src/element_binder';
import {TextBinder} from '../src/element_binder';
import {ViewPortBinder} from '../src/element_binder';
import {DecoratorDirective} from '../src/annotations';
import {TemplateDirective} from '../src/annotations';
import {ComponentDirective} from '../src/annotations';
import {ViewPort} from '../src/view';
import {ViewFactory} from '../src/view_factory';
import {Injector} from 'di/injector';
import {Inject} from 'di/annotations';

var injector,
  binder,
  element;

describe('ElementBinder', ()=>{
  it('should create a child injector', ()=>{
    createInjector();
    createElementAndBinder();
    var childInjector = binder.bind(injector, element);
    expect(childInjector.parent).toBe(injector);
  });

  it('should create a new instance of decorator and component directives'+
    ' and provide the element via DI', () => {
    var createdInstance;
    var injectedElement;

    @DecoratorDirective
    class SomeDecoratorDirective {
      @Inject(HTMLElement)
      constructor(element:HTMLElement) {
        createdInstance = this;
        injectedElement = element;
      }
    }
    @ComponentDirective
    class SomeComponentDirective {
      @Inject(HTMLElement)
      constructor(element:HTMLElement) {
        createdInstance = this;
        injectedElement = element;
      }
    }

    test(SomeDecoratorDirective);
    test(SomeComponentDirective);

    function test(directiveClass) {
      createdInstance = null;
      createInjector();
      createElementAndBinder(directiveClass);

      var childInjector = binder.bind(injector, element);
      expect(createdInstance).toBeTruthy();
      expect(injectedElement).toBe(element);
    }
  });
 
  it('component directives: it should append the template to the ShadowDOM', ()=>{
    var templateContainer = $('<div>a</div>')[0];

    var viewFactory = new ViewFactory(templateContainer.childNodes, null);

    @ComponentDirective
    class SomeComponentDirective {}

    createElementAndBinder(SomeComponentDirective);
    binder.setComponentViewFactory(viewFactory);

    var contentHtml = element.innerHTML = '<span id="outer"></span>';

    createInjector();
    binder.bind(injector, element);
    expect(element.shadowRoot.innerHTML).toBe(templateContainer.innerHTML);
    expect(element.innerHTML).toBe(contentHtml);        
  });

  it('should call bind on TextBinder children', ()=>{
    createInjector();
    createElementAndBinder();

    var textBinder1 = new TextBinder();
    var textBinder2 = new TextBinder();
    spyOn(textBinder1, 'bind');
    spyOn(textBinder2, 'bind');
    $(element).append('a<span>b</span>c');
    binder.addNonElementBinder(textBinder1, 0);
    binder.addNonElementBinder(textBinder2, 2);
    var childInjector = binder.bind(injector, element);

    expect(textBinder1.bind).toHaveBeenCalledWith(childInjector, element.childNodes[0]);
    expect(textBinder2.bind).toHaveBeenCalledWith(childInjector, element.childNodes[2]);
  });

  it('should call bind on ViewPortBinder children', ()=>{
    createInjector();
    createElementAndBinder();

    var viewPortBinder = new ViewPortBinder(null, null);
    spyOn(viewPortBinder, 'bind');
    $(element).append('a<span>b</span>c');
    binder.addNonElementBinder(viewPortBinder, 2);
    var childInjector = binder.bind(injector, element);

    expect(viewPortBinder.bind).toHaveBeenCalledWith(childInjector, element.childNodes[2]);
  });
});

describe('ViewPortBinder', ()=>{

  it('should create a new instance of a template directive and '+ 
    'pass in the ViewPort and ViewFactory to the constructor', ()=>{
    var createdInstance,
       injectedViewPort,
       injectedViewFactory;
    
    @TemplateDirective
    class SomeDirective {
      @Inject(ViewPort, ViewFactory)
      constructor(viewPort, viewFactory) {
        createdInstance = this;
        injectedViewPort = viewPort;
        injectedViewFactory = viewFactory;
      }
    }

    createInjector();
    var node = document.createComment('someComment');
    var viewFactory = new ViewFactory(null, null);    
    var viewPortBinder = new ViewPortBinder(
      new DirectiveClass(SomeDirective.annotations[0], SomeDirective),
      viewFactory);

    viewPortBinder.bind(injector, node);
    expect(createdInstance).toBeTruthy();
    expect(injectedViewPort.anchor).toEqual(node);
    expect(injectedViewFactory).toBe(viewFactory);
  });
});  

function createInjector() {
  injector = new Injector();
}

function createElementAndBinder(directive) {
  binder = new ElementBinderImpl();
  if (directive) {
    binder.addDirective(new DirectiveClass(directive.annotations[0], directive));
  }
  element = $('<div></div>')[0];
  element.shadowRoot = document.createElement('div');
  element.createShadowRoot = jasmine.createSpy('createShadowRoot').and.returnValue(element.shadowRoot);
}
