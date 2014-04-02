import {Directive} from '../annotations';
import {ArrayOfDirectiveClass, DirectiveClass} from './directive_class';
import {ElementSelector, SelectedElementBindings} from './element_selector';
import {assert} from 'rtts-assert';
import {NonElementSelector} from './non_element_selector';
import {CompilerConfig} from './compiler_config';

export {SelectedElementBindings};
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
    compilerConfig:CompilerConfig){
    this.directives = directives;
    this.nonElementSelector = new NonElementSelector(compilerConfig);
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

  matchElement(element:HTMLElement):SelectedElementBindings {
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

    return builder;
  }

  matchText(node:Text):string {
    return this.nonElementSelector.selectTextNode(node.nodeValue);
  }
}
