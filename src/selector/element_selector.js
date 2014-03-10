import {TemplateDirective, ComponentDirective, DecoratorDirective} from '../annotations';
import {DirectiveClass, ArrayOfDirectiveClass} from '../directive_class';
import {SelectorPart, ArrayOfSelectorPart} from './selector_part';
import {NodeAttrs} from '../types';

var SELECTOR_REGEXP = /^(?:([\w\-]+)|(?:\.([\w\-]+))|(?:\[([\w\-\*]+)(?:=([^\]]*))?\]))/;
var wildcard = new RegExp('\\*', 'g');

function matchingKey(obj, attrName:string){
  for(var key in obj){
    var pattern = key.replace(wildcard, '[\\w\\-]+');
    var exp = new RegExp(`^${pattern}\$`);

    if(exp.test(attrName)){
      return key;
    }
  }
}

function putIfAbsent(obj, name, create){
  var val = obj[name];
  
  if(!val){
    val = obj[name] = create();
  }

  return val;
}

function splitCss(selector:string):ArrayOfSelectorPart {
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
      throw new Error(`Unknown selector format '${selector}'.`);
    }

    var end = match.index + match[0].length;
    remainder = remainder.substring(end);
  }

  return parts;
}

export class SelectedElementBindings {
  constructor() {
    this.decorators = [];
    this.component = null;
    this.template = null;
    this.attrs = new NodeAttrs();
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
}

export class ElementSelector {
  constructor(name:string){
    this.name = name;
    this.elementMap = {};
    this.elementPartialMap = {};
    this.classMap = {};
    this.classPartialMap = {};
    this.attrValueMap = {};
    this.attrValuePartialMap = {};
  }

  addDirective(directive:DirectiveClass){
    var selector = directive.annotation.selector;
    var selectorParts = splitCss(selector);
    if (!selectorParts) {
      throw new Error(`Unsupported Selector: ${selector}`);
    }
    this._addDirective(selectorParts, directive);
  }
  
  _addDirective(selectorParts:ArrayOfSelectorPart, directive:DirectiveClass){
    var selectorPart = selectorParts.splice(0,1)[0];
    var terminal = selectorParts.length == 0;
    var name;

    if ((name = selectorPart.element) != null) {
      if (terminal) {
        putIfAbsent(this.elementMap, name, () => [])
          .push(directive)
      } else {
        putIfAbsent(this.elementPartialMap, name, () => new ElementSelector(name))
            ._addDirective(selectorParts, directive);
      }
    } else if ((name = selectorPart.className) != null) {
      if (terminal) {
        putIfAbsent(this.classMap, name, () => [])
          .push(directive);
      } else {
        putIfAbsent(this.classPartialMap, name, () => new ElementSelector(name))
          ._addDirective(selectorParts, directive);
      }
    } else if ((name = selectorPart.attrName) != null) {
      if (terminal) {
        var attrMap = putIfAbsent(this.attrValueMap, name, () => { return {}; });
        putIfAbsent(attrMap, selectorPart.attrValue, () => [])
          .push(directive);
      } else {
        var attrPartialMap = putIfAbsent(this.attrValuePartialMap, name, () => { return {}; });
        putIfAbsent(attrPartialMap, selectorPart.attrValue, () => new ElementSelector(name))
          ._addDirective(selectorParts, directive);
      }
    } else {
      throw new Error(`Unknown selector part '${selectorPart}'.`);
    }
  }

  selectNode(builder:SelectedElementBindings, partialSelection, nodeName:string) {
    var partial;

    if (this.elementMap[nodeName]) {
      builder.addDirectives(this.elementMap[nodeName]);
    }

    if (partial = this.elementPartialMap[nodeName]) {
      if (partialSelection == null) {
        partialSelection = [];
      }

      partialSelection.push(partial);
    }

    return partialSelection;
  }

  selectClass(builder:SelectedElementBindings, partialSelection, className:string) {
    var partial;

    if (this.classMap[className]) {
      builder.addDirectives(this.classMap[className]);
    }

    if (partial = this.classPartialMap[className]) {
      if (partialSelection == null) {
        partialSelection = [];
      }

      partialSelection.push(partial);
    }

    return partialSelection;
  }

  selectAttr(builder:SelectedElementBindings, partialSelection, attrName:string, attrValue:string) {
    var key = matchingKey(this.attrValueMap, attrName);
    var partial, lookup;

    if (key) {
      var valuesMap = this.attrValueMap[key];

      if (lookup = valuesMap['']) {
        builder.addDirectives(lookup);
      }

      if (attrValue != '' && (lookup = valuesMap[attrValue])) {
        builder.addDirectives(lookup);
      }
    }

    if (this.attrValuePartialMap[attrName]) {
      var valuesPartialMap = this.attrValuePartialMap[attrName];

      if (partial = valuesPartialMap['']) {
        if (partialSelection == null) {
          partialSelection = [];
        }

        partialSelection.push(partial);
      }

      if (attrValue != '' && (partial = valuesPartialMap[attrValue])) {
        if (partialSelection == null) {
            partialSelection = [];
        }

        partialSelection.push(partial);
      }
    }

    return partialSelection;
  }

  toString() {
    return `ElementSelector(${this.name})`;
  }
}
