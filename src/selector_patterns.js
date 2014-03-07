import {SelectorPart, ArrayOfSelectorPart} from './selector_part';

export var SELECTOR_REGEXP = /^(?:([\w\-]+)|(?:\.([\w\-]+))|(?:\[([\w\-\*]+)(?:=([^\]]*))?\]))/;
export var COMMENT_COMPONENT_REGEXP = /^\[([\w\-]+)(?:\=(.*))?\]$/;
export var CONTAINS_REGEXP = /^:contains\(\/(.+)\/\)$/;
export var ATTR_CONTAINS_REGEXP = /^\[\*=\/(.+)\/\]$/;

var wildcard = new RegExp('\\*', 'g');

export function matchingKey(obj, attrName:string){
  for(var key in obj){
    var pattern = key.replace(wildcard, '[\\w\\-]+');
    var exp = new RegExp(`^${pattern}\$`);

    if(exp.test(attrName)){
      return key;
    }
  }
}

export function splitCss(selector:string, type:Function):ArrayOfSelectorPart {
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
