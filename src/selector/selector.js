import {Directive} from '../annotations';
import {ArrayOfDirectiveClass} from '../directive_class';
import {DirectiveClass} from '../directive_class';
import {ElementBinder, TextBinder} from '../element_binder';
import {ElementSelector} from './element_selector';
import {assert} from 'assert';
import {InterpolationMarkers, NonElementSelector} from './non_element_selector';

/**
 * Selector has internal data structures which allow it to efficiently match DirectiveTypes 
 * against the Element and its classes and attributes. 
 * The product of the match is ElementBinder.
 * 
 * Lifetime: immutable for the duration of application. 
 * Different injector branches may have different instance of this class.
 */
export class Selector {
  constructor(
    directives:ArrayOfDirectiveClass,
    interpolationMarkers:InterpolationMarkers){
    this.directives = directives;
    this.nonElementSelector = new NonElementSelector(interpolationMarkers);
    this.elementSelector = new ElementSelector('', this.nonElementSelector);

    this.directives.forEach(this.addDirective.bind(this));
  }
  addDirective(directive:DirectiveClass) {
    var annotation = directive.annotation,
        type = directive.clazz,
        selector = annotation.selector;

    var match;

    if (!selector) {
      throw new Error(`Missing selector annotation for ${type}`);
    }

    this.elementSelector.addDirective(directive);
  }

  matchElement(element:HTMLElement):ElementBinder {
    var builder = new ElementBinder(),
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
    partialSelection = this.elementSelector.selectNode(builder, 
      partialSelection, nodeName);

    for(i = 0, length = classList.length; i < length; i++){
        var className = classList[i];

        classes[className] = true;

        partialSelection = this.elementSelector.selectClass(builder, 
          partialSelection, className);
    }

    for (i = 0, length = attributeList.length; i < length; i++) {
      var attr = attributeList[i],
          attrName = attr.name, 
          attrValue = attr.value;

      attrs[attrName] = attrValue;
      this.nonElementSelector.selectBindAttr(builder, attrName, attrValue);

      partialSelection = this.elementSelector.selectAttr(builder,
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

    return builder.isEmpty() ? null: builder;
  }

  matchText(node:Text):TextBinder {
    var binder = new TextBinder();
    this.nonElementSelector.selectTextNode(binder, node.nodeValue);
    return binder.isEmpty() ? null: binder;
  }
}
