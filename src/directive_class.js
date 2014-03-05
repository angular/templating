import {Directive} from './annotations';
import {assert} from 'assert';
import {Selector} from './selector';

/**
 * DirectiveClass represents all of the meta data for un-instantiated directive
 */
export class DirectiveClass {
  constructor(
    // The directive annotation
    annotation:Directive, 
    // The directive class
    clazz:Function
  ) {
    this.annotation = annotation;
    this.clazz = clazz;
  }
}

export class ArrayOfDirectiveClass {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(DirectiveClass));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}

/**
 * DirectiveClassSet represents the current set of registered directive types in the application. 
 * Since we support lazy loading of code the number of directives in the system is not 
 * stable over time. Directives needs to be immutable, so loading more directives 
 * implies that we need to create a child instance of DirectiveClassSet.
 * The DirectiveClassSet acts as a factory for Selector. 
 * (Since DirectiveClassSet is immutable the Selector instance is cached).
 * 
 * Lifetime: immutable for the duration of application. 
 * Different injector branches may have different instance of this class.
 */
export class DirectiveClassSet {  
  constructor(
    parentDirectives:DirectiveClassSet=null,
    directives:ArrayOfDirectiveClass
  ) {
    this.parentDirectives = parentDirectives;
    this.directives = directives;
  }

  selector():Selector {
    // TODO
    return null;
  }
}
