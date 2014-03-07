import {Directive} from './annotations';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {Selector} from './selector';
import {ElementSelector} from './element_selector';
import {ContainsSelector} from './contains_selector';
import {CONTAINS_REGEXP, ATTR_CONTAINS_REGEXP, splitCss} from './selector_patterns';
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
    var elementSelector = new ElementSelector('');
    var attrSelector = [];
    var textSelector = [];

    for(var i = 0, length = this.directives.length; i < length; i++){
      var directive = this.directives[i],
          annotation = directive.annotation,
          type = directive.clazz,
          selector = annotation.selector,
          selectorParts = [];

      var match;

      if (!selector) {
        throw new Error(`Missing selector annotation for ${type}`);
      }

      if ((match = CONTAINS_REGEXP.exec(selector)) != null) {
        textSelector.push(new ContainsSelector(directive, match[1]));
      } else if ((match = ATTR_CONTAINS_REGEXP.exec(selector)) != null) {
        attrSelector.push(new ContainsSelector(directive, match[1]));
      } else if ((selectorParts = splitCss(selector, type)) != null){
        elementSelector.addDirective(selectorParts, directive);
      } else {
        throw new Error(`Unsupported Selector: ${selector}`);
      }
    }

    return new Selector(this.directives, elementSelector, attrSelector, textSelector);
  }
}
