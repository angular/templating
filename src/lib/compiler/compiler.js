import {
  ArrayOfClass, ArrayLikeOfNodes, ArrayOfString,
  TextBinder, ElementBinder,
  NodeContainer,
  CompiledTemplate
} from '../types';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {Selector, SelectedElementBindings} from './selector';
import {Directive, TemplateDirective} from '../annotations';
import {Inject, InjectLazy} from 'di';
import {getAnnotation} from '../util/misc';
import {reduceTree} from '../util/tree_array';

/*
 * Compiler walks the DOM and calls Selector.match on each node in the tree.
 * It collects the resulting ElementBinders and stores them in a tree which mimics
 * the DOM structure.
 *
 * Lifetime: immutable for the duration of application.
 */
export class Compiler {
  constructor(@InjectLazy(Selector) selectorFactory) {
    this.selectorFactory = selectorFactory;
  }

  // Note: We are passing in a container and not an array of nodes
  // as this makes cloning and finding nodes (querySelectorAll) faster,
  // as we don't have to loop over the children but only call the methods
  // on the container!
  compileChildNodes(container:NodeContainer, directives:ArrayOfClass):CompiledTemplate {
    var directiveClasses = [];
    var self = this;
    directives.forEach(function(directive) {
      var annotation = getAnnotation(directive, Directive);
      if (annotation) {
        directiveClasses.push(new DirectiveClass(annotation, directive));
      }
    });
    return this._compileChildNodes(container, directiveClasses);
  }
  _compileChildNodes(container:NodeContainer, directiveClasses):CompiledTemplate {
    var selector = this.selectorFactory();
    selector.addDirectives(directiveClasses);
    return new CompileRun(selector).compile(container).build(container);
  }
}

class CompileElement {
  constructor({
    level,
    element,
    attrs,
    decorators,
    component,
    template,
    customElement
  }) {
    this.element = element;
    this.level = level;
    this.attrs = attrs || {
      init: {},
      bind: {},
      on: {}
    };
    this.decorators = decorators || [];
    this.component = component || null;
    this.template = template || null;
    this.textBinders = [];
    this.customElement = customElement;
  }
  hasBindings() {
    // Note: don't check attrs.init, as they don't define
    // whether there is a binding for the element nor not!
    for (var prop in this.attrs.bind) {
      return true;
    }
    for (var prop in this.attrs.on) {
      return true;
    }
    if (this.attrs.queryable) {
      return true;
    }
    if (this.component || this.decorators.length || this.template || this.textBinders.length) {
      return true;
    }
    if (this.customElement) {
      return true;
    }
    return false;
  }
  addTextBinder(expression:string, indexInParent:number) {
    this.textBinders.push({
      indexInParent: indexInParent,
      expression: expression
    });
  }
  toBinder(level) {
    return {
      level: level,
      attrs: this.attrs,
      decorators: this.decorators,
      component: this.component,
      template: this.template,
      textBinders: this.textBinders,
      customElement: this.customElement
    };
  }
}

class ArrayOfCompileElements {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(CompileElement));
  }
  constructor() {
    throw new Error('not instantiable as just a type');
  }
}

class CompileRun {
  constructor(selector:Selector, initialCompileElement:CompileElement = null) {
    this.selector = selector;
    this.initialCompileElement = initialCompileElement;
  }
  compile(container:NodeContainer):CompileRun {
    // Always create a root CompileElement, e.g. for text nodes directly
    // on the root of the template
    this.compileElements = [new CompileElement({element: null, level: 0})];
    if (this.initialCompileElement) {
      this.compileElements.push(this.initialCompileElement);
      this.initialCompileElement.level = 1;
    }
    this.compileRecurse(container, this.compileElements[this.compileElements.length-1]);
    return this;
  }
  build(container:NodeContainer) {
    var binders = [];
    reduceTree(this.compileElements, collectNonEmptyBindersAndCalcBinderTreeLevel, -1);
    return {
      container: container,
      binders: binders
    };

    function collectNonEmptyBindersAndCalcBinderTreeLevel(parentLevel, compileElement, index) {
      var newLevel;
      if (index === 0 || compileElement.hasBindings()) {
        newLevel = parentLevel+1;
        if (index>0) {
          compileElement.element.classList.add('ng-binder');
        }
        binders.push(compileElement.toBinder(newLevel));
      } else {
        newLevel = parentLevel;
      }
      return newLevel;
    }
  }
  compileRecurse(container:NodeContainer, parentElement:CompileElement) {
    // variables that are used inside of the inner functions
    var
      nodes = container.childNodes,
      nodeCount = nodes.length,
      nodeIndex,
      nodeType,
      node;

    for (nodeIndex=0; nodeIndex<nodeCount; nodeIndex++) {
      node = nodes[nodeIndex];
      nodeType = node.nodeType;
      if (nodeType == Node.ELEMENT_NODE) {
        var matchedBindings = this.selector.matchElement(node);
        var component;
        if (matchedBindings.component) {
          component = classFromDirectiveClass(matchedBindings.component);
        } else {
          component = null;
        }
        var compileElement = new CompileElement({
          level: parentElement.level+1,
          element: node,
          attrs: matchedBindings.attrs,
          decorators: matchedBindings.decorators.map(classFromDirectiveClass),
          component: component,
          customElement: matchedBindings.customElement
        });
        if (matchedBindings.template) {
          // special recurse for template directives
          this.compileElements.push(this._compileTemplateDirective(node, matchedBindings.template, compileElement));
        } else {
          this.compileElements.push(compileElement);
          this.compileRecurse(node, compileElement);
        }
      } else if (nodeType == Node.TEXT_NODE) {
        var textExpression = this.selector.matchText(node);
        if (textExpression) {
          parentElement.addTextBinder(textExpression, nodeIndex);
        }
      }
    }
  }
  _compileTemplateDirective(node:HTMLElement, templateDirective:DirectiveClass,
    compileElement:CompileElement):CompileElement {
    // replace the node with an empty <template> element,
    // as doing document.importNode(templateElement) will
    // also import the 'content' of the template element :-(
    // TODO: Figure out if this is an intended behavior or a bug
    var emptyTemplate = document.createElement('template');
    node.parentNode.insertBefore(emptyTemplate, node);
    node.remove();

    var elementLevel = compileElement.level;

    var initialCompiledTemplateElement = null;
    var compileNodeContainer;
    var templateNodeAttrs = compileElement.attrs;

    var templateContainer = node;
    if (node.nodeName !== 'TEMPLATE') {
      compileNodeContainer = node;
      templateContainer = document.createDocumentFragment();
      templateContainer.appendChild(node);
      if (compileElement.hasBindings()) {
        // not a template element and the original element contains
        // other directives or bindings, besides the template directive.
        // Then add the compileElement as
        // part of the template.
        initialCompiledTemplateElement = compileElement;
      }
      // split the attributes into those for the comment node and
      // those for the template element
      var bindAttrs = templateDirective.annotation.bind || {};
      var bindAttrNames = [];
      for (var bindAttrName in bindAttrs) {
        bindAttrNames.push(bindAttrName);
      }

      templateNodeAttrs = this._splitNodeAttrs(compileElement.attrs, bindAttrNames);
    } else {
      compileNodeContainer = node.content;
      templateContainer = node.content;
    }
    var compiledTemplate = new CompileRun(this.selector, initialCompiledTemplateElement)
      .compile(compileNodeContainer)
      .build(templateContainer);

    return new CompileElement({
      element: emptyTemplate,
      level: elementLevel,
      attrs: templateNodeAttrs,
      template: {
        directive: classFromDirectiveClass(templateDirective),
        compiledTemplate: compiledTemplate
      }
    });
  }
  _splitNodeAttrs(attrs, props:ArrayOfString) {
    var res = {
      init: attrs.init,
      bind: {}
    };
    props.forEach((propName) => {
      if (propName in attrs.bind) {
        res.bind[propName] = attrs.bind[propName];
        delete attrs.bind[propName];
      }
    });
    return res;
  }
  _replaceNodeWithComment(node, commentText) {
    var parent = node.parentNode;
    var comment = document.createComment(commentText);
    var comment = node.ownerDocument.createComment(commentText);
    parent.insertBefore(comment, node);
    parent.removeChild(node);
    return comment;
  }
}

function classFromDirectiveClass(directiveClass) {
  return directiveClass.clazz;
}
