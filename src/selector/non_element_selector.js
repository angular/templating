import {assert} from 'assert';
import {SelectedElementBindings} from './element_selector';

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
  _convertInterpolationToExpression(text:string) {
    var interpolationParts = text.split(this.regex),
       part, isExpression;
    if (interpolationParts.length <= 1) {
      // no expression found
      return null;
    }
    // we have at least one interpolation
    interpolationParts.forEach(function(part, index) {
      if (index % 2 === 0) {
        // plain text parts
        interpolationParts[index] = "'" + part + "'";
      }
    });
    return interpolationParts.join('+');
  }
  selectTextNode(text:string) {
    return this._convertInterpolationToExpression(text);
  }
  selectBindAttr(binder:SelectedElementBindings, attrName: string, attrValue: string) {
    // replace {{}} with bind-...
    var interpolationExpr = this._convertInterpolationToExpression(attrValue);
    var match;
    if (interpolationExpr) {
      attrValue = interpolationExpr;
      binder.attrs.bind[attrName] = attrValue;
    } else if (match = /bind-(.*)/.exec(attrName)) {
      binder.attrs.bind[match[1]] = attrValue;
    } else if (match = /on-(.*)/.exec(attrName)) {
      binder.attrs.event[match[1]] = attrValue;
    } else {
      binder.attrs.init[attrName] = attrValue;
    }
  }
}
