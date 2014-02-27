import {Selector} from './selector';
import {ArrayOfDirectiveClass} from './directive_class';

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
    parentDirectives/*TODO:DirectiveClassSet*/=null,
    directives/*TODO:ArrayOfDirectiveClass*/
  ) {
    this.parentDirectives = parentDirectives;
    this.directives = directives;
  }

  selector():Selector {
    // TODO
    return null;
  }
}
