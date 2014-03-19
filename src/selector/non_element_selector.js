import {assert} from 'assert';
import {SelectedElementBindings} from './element_selector';
import {CompilerConfig} from '../compiler_config';
import {NodeAttrs} from '../types';

export class ArrayOfMarkedText {
  static assert(obj) {
    assert(obj).arrayOf(structure({
      val: assert.string,
      expr: assert.boolean
    }));
  }
}

export class NonElementSelector {
  constructor(config:CompilerConfig) {
    this.config = config;
  }
  _convertInterpolationToExpression(text:string) {
    var interpolationParts = text.split(this.config.interpolationRegex),
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
      binder.attrs.bind[NodeAttrs.toCamelCase(attrName)] = attrValue;
    } else if (match = this.config.bindAttrRegex.exec(attrName)) {
      binder.attrs.bind[NodeAttrs.toCamelCase(match[1])] = attrValue;
    } else if (match = this.config.eventAttrRegex.exec(attrName)) {
      binder.attrs.event[NodeAttrs.toCamelCase(match[1])] = attrValue;
    } else {
      binder.attrs.init[NodeAttrs.toCamelCase(attrName)] = attrValue;
    }
  }
}
