import {Directive} from './annotations';
import {ArrayOfSelectorPart} from './selector_part';
import {BinderBuilder} from './binder_builder';
import {matchingKey} from './selector_patterns';

function putIfAbsent(obj, name, create){
  var val = obj[name];
  
  if(!val){
    val = obj[name] = create();
  }

  return val;
}

export class ElementSelector{
  constructor(name:string){
    this.name = name;
    this.elementMap = {};
    this.elementPartialMap = {};
    this.classMap = {};
    this.classPartialMap = {};
    this.attrValueMap = {};
    this.attrValuePartialMap = {};
  }

  addDirective(selectorParts:ArrayOfSelectorPart, directive:Directive){
    var selectorPart = selectorParts.splice(0,1)[0];
    var terminal = selectorParts.length == 0;
    var name;

    if ((name = selectorPart.element) != null) {
      if (terminal) {
        putIfAbsent(this.elementMap, name, () => [])
          .push(directive)
      } else {
        putIfAbsent(this.elementPartialMap, name, () => new ElementSelector(name))
            .addDirective(selectorParts, directive);
      }
    } else if ((name = selectorPart.className) != null) {
      if (terminal) {
        putIfAbsent(this.classMap, name, () => [])
          .push(directive);
      } else {
        putIfAbsent(this.classPartialMap, name, () => new ElementSelector(name))
          .addDirective(selectorParts, directive);
      }
    } else if ((name = selectorPart.attrName) != null) {
      if (terminal) {
        var attrMap = putIfAbsent(this.attrValueMap, name, () => { return {}; });
        putIfAbsent(attrMap, selectorPart.attrValue, () => [])
          .push(directive);
      } else {
        var attrPartialMap = putIfAbsent(this.attrValuePartialMap, name, () => { return {}; });
        putIfAbsent(attrPartialMap, selectorPart.attrValue, () => new ElementSelector(name))
          .addDirective(selectorParts, directive);
      }
    } else {
      throw new Error(`Unknown selector part '${selectorPart}'.`);
    }
  }

  selectNode(builder:BinderBuilder, partialSelection, node:Node, nodeName:string) {
    var partial;

    if (this.elementMap[nodeName]) {
      builder.addDirectiveClasses(this.elementMap[nodeName]);
    }

    if (partial = this.elementPartialMap[nodeName]) {
      if (partialSelection == null) {
        partialSelection = [];
      }

      partialSelection.push(partial);
    }

    return partialSelection;
  }

  selectClass(builder:BinderBuilder, partialSelection, node:Node, className:string) {
    var partial;

    if (this.classMap[className]) {
      builder.addDirectiveClasses(this.classMap[className]);
    }

    if (partial = this.classPartialMap[className]) {
      if (partialSelection == null) {
        partialSelection = [];
      }

      partialSelection.push(partial);
    }

    return partialSelection;
  }

  selectAttr(builder:BinderBuilder, partialSelection, node:Node, attrName:string, attrValue:string) {
    var key = matchingKey(this.attrValueMap, attrName);
    var partial, lookup;

    if (key) {
      var valuesMap = this.attrValueMap[key];

      if (lookup = valuesMap['']) {
        builder.addDirectiveClasses(lookup, attrValue);
      }

      if (attrValue != '' && (lookup = valuesMap[attrValue])) {
        builder.addDirectiveClasses(lookup, attrValue);
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
