import {assert} from 'rtts-assert';
import {Inject} from 'di';
import {Directive} from '../annotations';
import {ArrayOfDirectiveClass, DirectiveClass} from './directive_class';
import {ElementSelector, SelectedElementBindings} from './element_selector';
import {NonElementSelector} from './non_element_selector';
import {SelectorConfig} from './selector_config';

export {SelectedElementBindings};
/**
 * Selector has internal data structures which allow it to efficiently match DirectiveTypes
 * against the Element and its classes and attributes.
 * The product of the match is ElementBinder.
 *
 * Lifetime: immutable for the duration of application.
 */
export class Selector {
  @Inject(SelectorConfig)
  constructor(
    config:SelectorConfig){
    this.config = config;
  }
  matchElement(directives:ArrayOfDirectiveClass, element:HTMLElement):SelectedElementBindings {
    var initElementSelector = new ElementSelector('');
    var nonElementSelector = new NonElementSelector(this.config);
    directives.forEach(initElementSelector.addDirective.bind(initElementSelector));

    var builder = new SelectedElementBindings(),
        nodeName = element.tagName.toLowerCase(),
        attributeList = element.attributes,
        attrs = {},
        classList = element.classList,
        classes = {},
        i, length, j, jlength, partialSelection;

    // Set default attribute
    if (nodeName == 'input' && !attributeList['type']) {
      attributeList['type'] = 'text';
    }

    // Select node
    partialSelection = initElementSelector.selectNode(builder,
      partialSelection, nodeName);

    for(i = 0, length = classList.length; i < length; i++){
        var className = classList[i];

        classes[className] = true;

        partialSelection = initElementSelector.selectClass(builder,
          partialSelection, className);
    }

    for (i = 0, length = attributeList.length; i < length; i++) {
      var attr = attributeList[i],
          attrName = attr.name,
          attrValue = attr.value;

      attrs[attrName] = attrValue;
      nonElementSelector.selectBindAttr(builder, attrName, attrValue);

      partialSelection = initElementSelector.selectAttr(builder,
          partialSelection, attrName, attrValue);
    }

    while(partialSelection != null) {
      var elementSelectors = partialSelection;
      partialSelection = null;

      for(i = 0, length = elementSelectors.length; i < length; i++){
        var elementSelector = elementSelectors[i];

        for(var className in classes){
          partialSelection = elementSelector.selectClass(builder,
              partialSelection, className);
        }

        for(var attrName in attrs){
          partialSelection = elementSelector.selectAttr(builder,
              partialSelection, attrName, attrs[attrName]);
        }
      }
    }

    return builder;
  }

  matchText(node:Text):string {
    var nonElementSelector = new NonElementSelector(this.config);
    return nonElementSelector.selectTextNode(node.nodeValue);
  }
}
