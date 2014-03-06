import {DirectiveClass} from './directive_class';
import {ArrayOfDirectiveClass} from './directive_class';
import {ArrayOfNameValueString} from './types';
import {ArrayOfString} from './types';
import {assert} from 'assert';
import {TemplateDirective} from '../src/annotations';
import {ComponentDirective} from '../src/annotations';
import {DecoratorDirective} from '../src/annotations';

export class NonElementBinder {
  constructor(indexInParent:number) {
    this.indexInParent = indexInParent;
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
  bind() {
    // TODO
  }
}

/**
 * This class contains the list of directives, 
 * on-*, bind-* and {{}}. Given a DOM element and an injector 
 * it will create a module populated with directives, and createChild 
 * injector form it. It is also responsible for creating bindings from element to directives.
 * 1. create a module and install directives into it.
 * 2. create child injector and iterate over directive types to force instantiation of those directives
 * 3. notify EventService of onEvents for this element.
 * 4. return child injector
 * 
 * Lifetime: immutable for the duration of application.
 */
export class ElementBinder {
  constructor() {
    this.decorators = [];
    this.component = null;
    this.template = null;
    this.onEventAttrs = [];
    this.bindAttrs = [];
    this.attrs = [];
    // will be set by the compiler
    this.nonElementBinders = [];
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
  addNonElementBinder(binder:NonElementBinder) {
    this.nonElementBinders.push(binder);
  }
  isEmpty() {
    // Note: don't check this.attrs, as they don't define
    // whether there is a binding for the element nor not!
    return !this.onEventAttrs.length && !this.bindAttrs.length && !this.nonElementBinders.length
      && !this.template && !this.component && !this.decorators.length;
  }
  bind() {
    // TODO
    if (this.directNonElememtBinders) {
      // TODO: recurse
    }
  }
}

export class ArrayOfElementBinder {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(ElementBinder));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}
