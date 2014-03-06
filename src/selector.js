import {Directive} from './annotations';
import {ArrayOfDirectiveClass} from './directive_class';
import {ElementBinder, TextBinder} from './element_binder';
import {ElementSelector} from './element_selector';
import {ContainsSelector, ArrayOfContainsSelector} from './contains_selector';
import {BinderBuilder} from './binder_builder';
import {assert} from 'assert';

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
    elementSelector:ElementSelector, 
    attrSelector:ArrayOfContainsSelector, 
    textSelector: ArrayOfContainsSelector){
    this.directives = directives;
    this.elementSelector = elementSelector;
    this.attrSelector = attrSelector;
    this.textSelector = textSelector;
  }

	matchElement(element:HTMLElement):ElementBinder {
    var builder = new BinderBuilder(),
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
      partialSelection, element, nodeName);

    for(i = 0, length = classList.length; i < length; i++){
        var className = classList[i];

        classes[className] = true;

        partialSelection = this.elementSelector.selectClass(builder, 
          partialSelection, element, className);
    }

    for (i = 0, length = attributeList.length; i < length; i++) {
      var attr = attributeList[i],
          attrName = attr.name, 
          attrValue = attr.value;

      attrs[attrName] = attrValue;

      for (j = 0, jlength = this.attrSelector.length; j < jlength; j++) {
        var selectorRegExp = this.attrSelector[j];

        if (selectorRegExp.regexp.test(value)) {
          // this directive is matched on any attribute name, and so
          // we need to pass the name to the directive by prefixing it to
          // the value. Yes it is a bit of a hack.
          //FIX
          //this.directives[selectorRegExp.annotation].forEach((type) => {
          //  directiveRefs.add(new DirectiveRef(
          //      node, type, selectorRegExp.annotation, `${attrName}=${value}`));
          //});
        }
      }

      partialSelection = this.elementSelector.selectAttr(builder,
          partialSelection, element, attrName, attrValue);
    }

    while(partialSelection != null) {
      var elementSelectors = partialSelection;
      partialSelection = null;

      for(i = 0, length = elementSelectors.length; i < length; i++){
        var elementSelector = elementSelectors[i];

        for(var className in classes){
          partialSelection = elementSelector.selectClass(builder,
              partialSelection, element, className);
        }

        for(var attrName in attrs){
          partialSelection = elementSelector.selectAttr(builder,
              partialSelection, element, attrName, attrs[attrName]);
        }
      }
    }

    return builder.buildForElement();
  }

  matchText(node:Text):TextBinder {
    var value = node.data,
        builder = new BinderBuilder(),
        i, length;

    for (i = 0, length = this.textSelector.length; i < length; i++) {
      var selectorRegExp = this.textSelector[i];

      if (selectorRegExp.regexp.test(value)) {

        //FIX
        //directives[selectorRegExp.annotation].forEach((type) => {
        //  directiveRefs.add(new DirectiveRef(node, type,
        //      selectorRegExp.annotation, value));
        //});
      }
    }

    return builder.buildForText();
  }
}
