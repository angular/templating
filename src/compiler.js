import {ArrayLikeOfNodes} from './types';
import {ArrayOfElementBinder} from './element_binder';
import {ElementBinder} from './element_binder';
import {NonElementBinder} from './element_binder';
import {DirectiveClassSet} from './directive_class';
import {DirectiveClass} from './directive_class';
import {ViewFactory} from './view_factory';
import {Selector} from './selector';
import {TemplateDirective} from './annotations';

/*
 * Compiler walks the DOM and calls Selector.match on each node in the tree. 
 * It collects the resulting ElementBinders and stores them in tree which mimics 
 * the DOM structure for easy invocation of ElementBinder.bind on view clone. 
 * The resulting list of ElementBinders as well as the templ Node is returned as a ViewFactory.
 * 
 * Lifetime: immutable for the duration of application.
 */
export class Compiler {
  compile(nodes:ArrayLikeOfNodes, directives:DirectiveClassSet):ViewFactory {
    var binders = this._compile(fragment.childNodes, directives.selector());
    // TODO: Convert the nodes into a document fragment if needed
    return new ViewFactory(nodes, binders);
  }
  _compile(nodes:ArrayLikeOfNodes, selector:Selector):ArrayOfElementBinder {
    // Always create a root elememtBinder for text nodes directly
    // on the root of the template
    var binders = [new ElementBinder({})];
    this._compileRecurse(nodes, selector, binders, binders[0]);
    return binders;
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
          if (templateDirective) {
            var viewPortBinder = new ViewPortBinder(compileTemplateDirective(templateDirective, binder));
            addNonElementBinder(viewPortBinder);
          } else {
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
      binder.indexInParent = nodeIndex;
      if (!parentElementBinder) {
        parentElementBinder = new ElementBinder({});
        addElementBinder(node.parentNode, parentElementBinder);
      }
      parentElementBinder.addNonElementBinder(binder);
    }

    function markBinderElement(element) {
      if (element.className) {
        element.className += ' ng-binder';
      } else {
        element.className = 'ng-binder';
      }
    }

    function compileTemplateDirective(templateDirective:DirectiveClass,
      currentBinder:ElementBinder):ViewFactory {
      var viewFactory;
      var templateBinders = [new ElementBinder({})];

      if (node.nodeName === 'TEMPLATE') {
        var childNodes = node.content ? node.content.childNodes : node.childNodes;
        self._compileRecurse(childNodes, selector, 
          templateBinders, templateBinders[templateBinders.length-1]);
        viewFactory = new ViewFactory(childNodes, templateBinders);
      } else {
        currentBinder.template = null;
        if (!currentBinder.isEmpty()) {
          // if there are other directives on the element,
          // start the recursing with an already parsed first binder
          markBinderElement(node);
          templateBinders.push(currentBinder);
        }
        self._compileRecurse(node.childNodes, selector, 
          templateBinders, templateBinders[templateBinders.length-1]);
        viewFactory = new ViewFactory(node, templateBinders);
      }
      var parent = node.parentNode;
      var comment = document.createComment('template anchor');
      parent.insertBefore(comment, node);
      parent.removeChild(node);
      node = comment;
      return viewFactory;
    }

  }
}

// Public so this can be used in a precompiled template
export class ViewPortBinder extends NonElementBinder {
  constructor(viewFactory:ViewFactory) {
    this.viewFactory = viewFactory;
  }
  bind() {
    // TODO
  }
}

