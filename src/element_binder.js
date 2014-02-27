import {DirectiveClass} from './directive_class';
import {ArrayOfDirectiveClass} from './directive_class';
import {ArrayOfNameValueString} from './types';
import {ArrayOfString} from './types';

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
      // List of directives which matched the template element.
      decorators:ArrayOfDirectiveClass,
      // A template directive if found
      template:DirectiveClass,
      // A component directive if found
      component:DirectiveClass,
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
    this.decorators = data.decorators;
    this.template = data.template;
    this.component = data.component;
    this.onEvents = data.onEvents;
    this.bindAttrs = data.bindAttrs;
    this.attrs = data.attrs;
  }
	
}
