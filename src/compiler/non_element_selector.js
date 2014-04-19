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
  constructor(config:SelectorConfig) {
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
  selectBindAttr(binder:SelectedElementBindings, attrName: string, attrValue: string) {
    // replace {{}} with bind-...
    var interpolationExpr = this._convertInterpolationToExpression(attrValue);
    var match;
    if (interpolationExpr) {
      attrValue = interpolationExpr;
      binder.attrs.bind[this._toCamelCase(attrName)] = attrValue;
    } else if (match = this.config.bindAttrRegex.exec(attrName)) {
      binder.attrs.bind[this._toCamelCase(match[1])] = attrValue;
    } else {
      binder.attrs.init[this._toCamelCase(attrName)] = attrValue;
    }
  }
  selectEventData(nodeName:string, attrs, matchedDirectives) {
    var res = [];
    matchedDirectives.forEach((dir)=>{
      if (dir.annotation.on) {
        for (var evtName in dir.annotation.on) {
          res.push({
            event: evtName, handler: 'directive', directive: dir.clazz, expression: dir.annotation.on[evtName]
          });
        }
      }
    });
    var match;
    for (var attrName in attrs) {
      if (match = this.config.eventAttrRegex.exec(attrName)) {
        res.push({
          event: match[1], handler: 'onEvent', expression: attrs[attrName]
        });
      }
    }
    this.config.refreshNodePropertyEvents.forEach((configEntry) => {
      if (configEntry.nodeName === nodeName) {
        configEntry.events.forEach((eventName) => {
          res.push({
            event: eventName, handler: 'refreshNode', properties: configEntry.properties
          });
        });
      }
    });
    return res;
  }
}
