import {Directive} from './annotations';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {Selector} from './selector/selector';
import {assert} from 'assert';

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
    return new Selector(this.directives);
  }
}
