import {Directive} from './annotations';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {Selector} from './selector';
import {SelectorPart, ArrayOfSelectorPart} from './selector_part';
import {ElementSelector} from './element_selector';
import {ContainsSelector} from './contains_selector';
import {assert} from 'assert';

var SELECTOR_REGEXP = /^(?:([\w\-]+)|(?:\.([\w\-]+))|(?:\[([\w\-\*]+)(?:=([^\]]*))?\]))/;
var COMMENT_COMPONENT_REGEXP = /^\[([\w\-]+)(?:\=(.*))?\]$/;
var CONTAINS_REGEXP = /^:contains\(\/(.+)\/\)$/;
var ATTR_CONTAINS_REGEXP = /^\[\*=\/(.+)\/\]$/;

function splitCss(selector:string, type:Function):ArrayOfSelectorPart {
  var parts = [];
  var remainder = selector;
  var match;

  while (remainder !== '') {
    if ((match = SELECTOR_REGEXP.exec(remainder)) != null) {
      if (match[1] != null) {
        parts.push(SelectorPart.fromElement(match[1].toLowerCase()));
      } else if (match[2] != null) {
        parts.push(SelectorPart.fromClass(match[2].toLowerCase()));
      } else if (match[3] != null) {
        var attrValue = match[4] == null ? '' : match[4].toLowerCase();
        parts.push(SelectorPart.fromAttribute(match[3].toLowerCase(), attrValue));
      } else {
        throw `Missmatched RegExp ${SELECTOR_REGEXP} on ${remainder}`;
      }
    } else {
      throw new Error(`Unknown selector format '${selector}' for ${type}.`);
    }

    var end = match.index + match[0].length;
    remainder = remainder.substring(end);
  }

  return parts;
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
        throw new ArgumentError(`Missing selector annotation for ${type}`);
      }

      if ((match = CONTAINS_REGEXP.exec(selector)) != null) {
        textSelector.push(new ContainsSelector(annotation, match[1]));
      } else if ((match = ATTR_CONTAINS_REGEXP.exec(selector)) != null) {
        attrSelector.push(new ContainsSelector(annotation, match[1]));
      } else if ((selectorParts = splitCss(selector, type)) != null){
        elementSelector.addDirective(selectorParts, directive);
      } else {
        throw new ArgumentError(`Unsupported Selector: ${selector}`);
      }
    }

    return new Selector(this.directives, elementSelector, attrSelector, textSelector);
  }
}
