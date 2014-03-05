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
class ElementBinderConstructorArgs {
  static assert(obj) {
    assert(obj).is(assert.structure({
      // List of found directives on the element
      directives:ArrayOfDirectiveClass,
      // List of on-* attributes found
      onEvents:ArrayOfString,
      // List of bind-* attributes found
      // Attributes containing {{}} get translated as
      // src="{{img}}.png" => bind-src="'' + img + '.png'"
      bindAttrs:ArrayOfNameValueString,
      // List of all attributes
      attrs:ArrayOfNameValueString      
    }));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}

export class ElementBinder {
  constructor(data:ElementBinderConstructorArgs) {
    var self = this;
    this.decorators = [];
    if (data.directives) {      
      data.directives.forEach(function(directive) {
        if (directive.annotation instanceof TemplateDirective) {
          self.template = directive;
        } else if (directive.annotation instanceof ComponentDirective) {
          self.component = directive;
        } else if (directive.annotation instanceof DecoratorDirective) {
          self.decorators.push(directive);
        }
      });
    }
    this.onEvents = data.onEvents;
    this.bindAttrs = data.bindAttrs;
    this.attrs = data.attrs;
    // will be set by the compiler
    this.nonElementBinders = null;
  }
  addNonElementBinder(binder:NonElementBinder) {
    if (!this.nonElementBinders) {
      this.nonElementBinders = [];
    }
    this.nonElementBinders.push(binder);
  }
  isEmpty() {
    return colEmpty(this.onEvents) && colEmpty(this.bindAttrs) && colEmpty(this.nonElementBinders)
      && !this.template && !this.component && colEmpty(this.decorators);

    function colEmpty(col) {
      return !col || col.length === 0;
    }  
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
