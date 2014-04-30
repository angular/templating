import {assert} from 'rtts-assert';

export class SelectorPart {
  toString(){
    return this.element == null 
      ? (this.className == null
         ? (this.attrValue == '' ? `[${this.attrName}]` : `[${this.attrName}=${this.attrValue}]`)
         : `.${this.className}`)
      : this.element;
  }
}

SelectorPart.fromElement = function(element):SelectorPart {
  var part = new SelectorPart();
  part.element = element;
  part.className = null;
  part.attrName = null;
  part.attrValue = null;
  return part;
}

SelectorPart.fromClass = function(className:string):SelectorPart {
  var part = new SelectorPart();
  part.element = null;
  part.className = className;
  part.attrName = null;
  part.attrValue = null;
  return part;
}

SelectorPart.fromAttribute = function(attrName:string, attrValue:string):SelectorPart{
  var part = new SelectorPart();
  part.element = null;
  part.className = null;
  part.attrName = attrName;
  part.attrValue = attrValue;
  return part;
}

export class ArrayOfSelectorPart {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(SelectorPart));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}
