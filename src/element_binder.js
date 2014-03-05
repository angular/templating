import {DirectiveClass} from './directive_class';
import {ArrayOfDirectiveClass} from './directive_class';
import {ArrayOfNameValueString} from './types';
import {ArrayOfString} from './types';
import {assert} from 'assert';
import {TemplateDirective} from './annotations';
import {ComponentDirective} from './annotations';
import {DecoratorDirective} from './annotations';
import {Injector} from 'di/injector';
import {Provide} from 'di/annotations';
import {ViewPort} from './view';
import {ViewFactory} from './view_factory';
import {ElementBinder} from './types';
import {NonElementBinder} from './types';

/**
 * This class contains the list of directives,
 * on-*, bind-* and {{}} attributes for an element. 
 * 
 * Given a DOM element and a base injector it will:
 * 1. create a module and install directives into it.
 * 2. create child injector and iterate over directive types to force instantiation of those directives
 * 3. notify EventService of onEvents for this element.
 * 4. initialize the data binding
 * 
 * Lifetime: immutable for the duration of application.
 */
export class ElementBinderImpl extends ElementBinder {
  constructor() {
    this.decorators = [];
    this.component = null;
    this.template = null;
    this.onEventAttrs = [];
    this.bindAttrs = [];
    this.attrs = [];
    // will be set by the compiler
    this.nonElementBinders = [];
    this.componentViewFactory = null;
  }

  addBindAttr(name:string, value:string) {
    this.bindAttrs.push({name:name, value: value});
  }
  addOnEventAttr(name:string, value:string) {
    this.onEventAttrs.push({name:name, value: value});
  }
  addAttr(name:string, value:string) {
    this.attrs.push({name:name, value: value});
  }
  addDirectives(directiveClasses:ArrayOfDirectiveClass){    
    for(var i = 0, length = directiveClasses.length; i < length; i++){
      this.addDirective(directiveClasses[i]);
    }
  }
  addDirective(directive:DirectiveClass) {
    if (directive.annotation instanceof TemplateDirective) {
      this.template = directive;
    } else if (directive.annotation instanceof ComponentDirective) {
      this.component = directive;
    } else if (directive.annotation instanceof DecoratorDirective) {
      this.decorators.push(directive);
    }    
  }
  addNonElementBinder(binder:NonElementBinder, indexInParent:number) {
    binder.indexInParent = indexInParent;
    this.nonElementBinders.push(binder);
  }
  // will be called by the compiler
  setComponentViewFactory(viewFactory:ViewFactory) {
    this.componentViewFactory = viewFactory;
  }
  isEmpty() {
    // Note: don't check this.attrs, as they don't define
    // whether there is a binding for the element nor not!
    return !this.onEventAttrs.length && !this.bindAttrs.length && !this.nonElementBinders.length
      && !this.template && !this.component && !this.decorators.length;
  }
  bind(injector:Injector, element:HTMLElement) {
    @Provide(HTMLElement)
    function elementProvider() {
      return element;
    }
    // TODO: restrict access to
    // parent injectors -> need to change the injector?? (see dart injector)
    var self = this;
    var childInjector = injector.createChild([elementProvider]);

    if (this.decorators) {
      this.decorators.forEach(createDirective);
    }
    if (this.component) {
      this._bindComponentTemplate(injector, element);
      createDirective(this.component);
    }

    this._bindNonElementBinders(childInjector, element);
    return childInjector;

    function createDirective(directiveClass) {
      var directiveInstance = childInjector.get(directiveClass.clazz);
      self._initDataBinding(childInjector, directiveInstance);      
    }
  }
  _bindComponentTemplate(injector:Injector, element:HTMLElement) {
    if (this.componentViewFactory) {
      var view = this.componentViewFactory.createView(injector);
      // TODO: Make ShadowDOM optional using custom transclusion
      var root = element.createShadowRoot();
      view.appendTo(root);
    }
  }
  _bindNonElementBinders(injector:Injector, element:HTMLElement) {
    if (this.nonElementBinders) {
      this.nonElementBinders.forEach((nonElementBinder) => {
        nonElementBinder.bind(injector, element.childNodes[nonElementBinder.indexInParent]);
      });
    }    
  }
  _initDataBinding(injector:Injector, directiveInstance:Object) {
    // TODO: apply attribute values to matching properties on the directives
    // TODO initalize data binding
  }
}

export class TextBinder extends NonElementBinder {
  constructor() {
    // will be set by the compiler
    this.indexInParent = null;
    this.parts = [];
  }
  addPart(value:string, expression:boolean) {
    this.parts.push({val: value, expr: expression});
  }
  isEmpty() {
    return this.parts.length === 0;
  }
  bind(injector:Injector, node:Text) {
    // TODO initalize data binding
  }
}

export class ViewPortBinder extends NonElementBinder {
  constructor(templateDirective:DirectiveClass, viewFactory:ViewFactory) {
    this.viewFactory = viewFactory;
    this.templateDirective = templateDirective;
  }
  bind(injector:Injector, node:Comment) {
    var self = this;
    @Provide(ViewPort)
    function viewPortProvider() {
      return new ViewPort(node);
    }
    @Provide(ViewFactory)
    function viewFactoryProvider() {
      return self.viewFactory;
    }

    var childInjector = injector.createChild([viewPortProvider, viewFactoryProvider]);
    var templateDirectiveInstance = childInjector.get(this.templateDirective.clazz);
    this.initDataBinding(childInjector, templateDirectiveInstance);
  }
  initDataBinding(injector:Injector, directive:Object) {
    // TODO initalize data binding
  }
}

