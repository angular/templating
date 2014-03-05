import {ArrayLikeOfNodes} from './types';
import {ArrayOfElementBinder} from './types';
import {ElementBinder} from './types';
import {ElementBinderImpl} from './element_binder';
import {NonElementBinder} from './types';
import {DirectiveClass} from './directive_class';
import {ViewFactory} from './view_factory';
import {Selector} from './selector/selector';
import {TemplateDirective} from './annotations';
import {ViewPortBinder} from './element_binder';

/*
 * Compiler walks the DOM and calls Selector.match on each node in the tree. 
 * It collects the resulting ElementBinders and stores them in tree which mimics 
 * the DOM structure for easy invocation of ElementBinder.bind on view clone. 
 * The resulting list of ElementBinders as well as the templ Node is returned as a ViewFactory.
 * 
 * Lifetime: immutable for the duration of application.
 */
export class Compiler {
  compile(nodes:ArrayLikeOfNodes, selector:Selector):ViewFactory {
    // Always create a root elememtBinder for text nodes directly
    // on the root of the template
    var binders = [new ElementBinderImpl(null)];
    this._compileRecurse(nodes, selector, binders, binders[0]);
    return new ViewFactory(nodes, binders);
  }
  _compileRecurse(nodes:ArrayLikeOfNodes, selector:Selector, binders:ArrayOfElementBinder, parentElementBinder:ElementBinder) {
    // variables that are used inside of the inner functions
    var self = this,
      nodeCount = nodes.length,
      nodeIndex,
      nodeType,
      node;
    
    for (nodeIndex=0; nodeIndex<nodeCount; nodeIndex++) {
      node = nodes[nodeIndex];
      nodeType = node.nodeType;
      if (nodeType == Node.ELEMENT_NODE) {
        var binder = selector.matchElement(node);
        if (binder) {          
          var templateDirective = binder.template;
          var componentDirective = binder.component;
          if (templateDirective) {
            var viewPortBinder = compileTemplateDirective(templateDirective, binder);
            addNonElementBinder(viewPortBinder);
          } else {
            if (componentDirective) {
              compileComponentDirective(componentDirective, binder);
            }
            addElementBinder(node, binder);
          }
        }
        this._compileRecurse(node.childNodes, selector, binders, binder);
      } else if (nodeType == Node.TEXT_NODE) {
        var textBinder = selector.matchText(node);
        if (textBinder) {
          addNonElementBinder(textBinder);
        }
      } 
    }

    function addElementBinder(element, binder) {
      markBinderElement(element);
      binders.push(binder);
    }

    function addNonElementBinder(binder) {
      if (!parentElementBinder) {
        parentElementBinder = new ElementBinderImpl(null);
        addElementBinder(node.parentNode, parentElementBinder);
      }
      parentElementBinder.addNonElementBinder(binder, nodeIndex);
    }

    function markBinderElement(element) {
      if (element.className) {
        element.className += ' ng-binder';
      } else {
        element.className = 'ng-binder';
      }
    }

    function compileTemplateDirective(templateDirective:DirectiveClass,
      currentBinder:ElementBinder):ViewPortBinder {
      var viewFactory;
      var templateBinders = [new ElementBinderImpl(null)];

      if (node.nodeName === 'TEMPLATE') {
        var childNodes = node.content ? node.content.childNodes : node.childNodes;
        self._compileRecurse(childNodes, selector, 
          templateBinders, templateBinders[templateBinders.length-1]);
        viewFactory = new ViewFactory(childNodes, templateBinders);
      } else {
        currentBinder.template = null;
        if (!currentBinder.isEmpty()) {
          // if there are other directives on the element,
          // start recursing with an already parsed first binder
          markBinderElement(node);
          templateBinders.push(currentBinder);
        }
        self._compileRecurse(node.childNodes, selector, 
          templateBinders, templateBinders[templateBinders.length-1]);
        viewFactory = new ViewFactory([node], templateBinders);
      }
      var parent = node.parentNode;
      var comment = document.createComment('template anchor');
      parent.insertBefore(comment, node);
      parent.removeChild(node);
      node = comment;
      return new ViewPortBinder(templateDirective, viewFactory);
    }

    function compileComponentDirective(componentDirective:DirectiveClass, 
      currentBinder:ElementBinder) {
      var template = componentDirective.annotation.template;
      var viewFactory;
      if (template instanceof ViewFactory) {
        viewFactory = template;
      } else {
        var templateContainer = document.createElement('div');
        templateContainer.innerHTML = template;
        viewFactory = self.compile(templateContainer.childNodes, selector);
      }
      currentBinder.setComponentViewFactory(viewFactory);
    }

  }
}


