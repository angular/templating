import {assert} from 'assert';
import {TextBinder, ElementBinder} from '../element_binder';

export class InterpolationMarkers {
  static assert(obj) {
    assert(obj).is(assert.structure({
      start: assert.string,
      end: assert.string
    }));
  }
}

export class ArrayOfMarkedText {
  static assert(obj) {
    assert(obj).arrayOf(structure({
      val: assert.string,
      expr: assert.boolean
    }));
  }
}

export class NonElementSelector {
  constructor(markers:InterpolationMarkers) {
    if (!markers) {
      markers = {
        start: '{{',
        end: '}}'
      }
    }
    this.regex = new RegExp(markers.start+'(.*?)'+markers.end, 'g');
  }
  selectTextNode(binder:TextBinder, text:string) {
    var interpolationParts = text.split(this.regex),
       part, isExpression;
    if (interpolationParts.length <= 1) {
      // no expression found
      return;
    }
    for (var i=0; i<interpolationParts.length; i++) {
      part = interpolationParts[i];
      // expressions are on the odd indices returned by the above split command!
      isExpression = i%2 === 1;
      if (part) {
        binder.addPart(part, isExpression);
      }
    }
  }
  selectBindAttr(binder:ElementBinder, attrName: string, attrValue: string) {
    // replace {{}} with bind-...
    var interpolationParts = attrValue.split(this.regex);
    var match;
    if (interpolationParts.length > 1) {
      // we have at least one interpolation
      interpolationParts.forEach(function(part, index) {
        if (index % 2 === 0) {
          // plain text parts
          interpolationParts[index] = "'" + part + "'";
        }
      });
      attrValue = interpolationParts.join('+');
      binder.addBindAttr(attrName, attrValue);
    } else if (match = /bind-(.*)/.exec(attrName)) {
      binder.addBindAttr(match[1], attrValue);
    } else if (match = /on-(.*)/.exec(attrName)) {
      binder.addOnEventAttr(match[1], attrValue);
    } else {
      binder.addAttr(attrName, attrValue);
    }
  }
}
