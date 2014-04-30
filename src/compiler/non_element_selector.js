import {assert} from 'rtts-assert';
import {SelectedElementBindings} from './element_selector';
import {SelectorConfig} from './selector_config';

export class ArrayOfMarkedText {
  static assert(obj) {
    assert(obj).arrayOf(structure({
      val: assert.string,
      expr: assert.boolean
    }));
  }
}
export class NonElementSelector {
  constructor(config) {
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
      } else {
        // expression parts
        interpolationParts[index] = "(" + part + ")";
      }
    });
    return interpolationParts.join('+');
  }
  _toCamelCase(attrName) {
    return attrName.split('-').map((part, index) => {
      if (index>0) {
        return part.charAt(0).toUpperCase()+part.substring(1);
      } else {
        return part;
      }
    }).join('');
  }
  selectTextNode(text:string) {
    return this._convertInterpolationToExpression(text);
  }
  selectBindAttr(binder:SelectedElementBindings, attrs) {
    var initAttrsCandidates = {};
    for (var attrName in attrs) {
      var attrValue = attrs[attrName];
      // replace {{}} with bind-...
      var interpolationExpr = this._convertInterpolationToExpression(attrValue);
      var match;
      if (interpolationExpr) {
        attrValue = interpolationExpr;
        binder.attrs.bind[this._toCamelCase(attrName)] = attrValue;
      } else if (match = this.config.bindAttrRegex.exec(attrName)) {
        binder.attrs.bind[this._toCamelCase(match[1])] = attrValue;
      } else if (match = this.config.eventAttrRegex.exec(attrName)) {
        binder.attrs.on[this._toCamelCase(match[1])] = attrValue;
      } else {
        initAttrsCandidates[this._toCamelCase(attrName)] = attrValue;
      }
    }
    attrs.init = {};
    // fill attrs.init with the attribute values for attributes
    // that are bound via bind- or are bound via Directive.bind
    for (var attrName in attrs.bind) {
      if (attrName in initAttrsCandidates) {
        attrs.init[attrName] = initAttrsCandidates[attrName];
      }
    }
    binder.directives.forEach((directive) => {
      var bindAttrs = directive.annotation.bind;
      for (var attrName in bindAttrs) {
        if (attrName in initAttrsCandidates) {
          attrs.init[attrName] = initAttrsCandidates[attrName];
        }
      }
    });
  }
}
