import {
  ArrayOfClass, ArrayLikeOfNodes, ArrayOfString,
  NonElementBinder, ElementBinder,
  NodeContainer,
  CompiledTemplate
} from '../types';
import {SimpleNodeContainer} from '../util/simple_node_container';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {Selector, SelectedElementBindings} from './selector';
import {Directive, TemplateDirective} from '../annotations';
import {TreeArray, reduceTree} from '../util/tree_array';
import {Inject} from 'di';
import {AnnotationProvider} from '../util/annotation_provider';

/*
 * Compiler walks the DOM and calls Selector.match on each node in the tree.
 * It collects the resulting ElementBinders and stores them in tree which mimics
 * the DOM structure.
 *
 * Lifetime: immutable for the duration of application.
 */
export class Compiler {
  @Inject(Selector, AnnotationProvider)
  constructor(selector:Selector, annotationProvider:AnnotationProvider) {
    this.selector = selector;
    this.annotationProvider = annotationProvider;
  }

  compileNodes(nodes:ArrayLikeOfNodes, directives: ArrayOfClass):CompiledTemplate {
    return this.compileChildNodes(new SimpleNodeContainer(nodes), directives);
  }

  // Note: We are passing in a container and not an array of nodes
  // as this makes cloning and finding nodes (querySelectorAll) faster,
  // as we don't have to loop over the children but only call the methods
  // on the container!
  compileChildNodes(container:NodeContainer, directives:ArrayOfClass):CompiledTemplate {
    var directiveClasses = [];
    var self = this;
    directives.forEach(function(directive) {
      var annotation = self.annotationProvider.annotation(directive, Directive);
      if (annotation) {
        directiveClasses.push(new DirectiveClass(annotation, directive));
      }
    });
    return this._compileChildNodes(container, directiveClasses);
  }
  _compileChildNodes(container:NodeContainer, directiveClasses):CompiledTemplate {
    return new CompileRun(this.selector, directiveClasses).compile(container).build(container);
  }
}

class CompileElement {
  constructor({
    element,
    attrs,
    events,
    decorators,
    component,
    level
  }) {
    this.element = element;
    this.level = level;
    this.attrs = attrs || {
      init: {},
      bind: {}
    };
    this.events = events;
    this.decorators = decorators || [];
    this.component = component || null;
    this.nonElementBinders = [];
  }
  hasBindings() {
    // Note: don't check attrs.init, as they don't define
    // whether there is a binding for the element nor not!
    for (var prop in this.attrs.bind) {
      return true;
    }
    if (this.events && this.events.length) {
      return true;
    }
    if (this.component || this.decorators.length || this.nonElementBinders.length) {
      return true;
    }
    return false;
  }
  addNonElementBinder(binder:NonElementBinder, indexInParent:number) {
    this.nonElementBinders.push(binder);
    binder.indexInParent = indexInParent;
  }
  toBinder() {
    return {
      attrs: this.attrs,
      events: this.events,
      level: this.level,
      decorators: this.decorators,
      component: this.component,
      nonElementBinders: this.nonElementBinders
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
  constructor(selector:Selector, directiveClasses, initialCompileElement:CompileElement = null) {
    this.selector = selector;
    this.directiveClasses = directiveClasses;
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
          if (compileElement.element.className) {
            compileElement.element.className += ' ng-binder';
          } else {
            compileElement.element.className = 'ng-binder';
          }
        }
        var binder = compileElement.toBinder();
        binder.level = newLevel;
        binders.push(binder);
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
      node,
      nonElementBinder;

    for (nodeIndex=0; nodeIndex<nodeCount; nodeIndex++) {
      node = nodes[nodeIndex];
      nodeType = node.nodeType;
      nonElementBinder = null;
      if (nodeType == Node.ELEMENT_NODE) {
        var matchedBindings = this.selector.matchElement(this.directiveClasses, node);
        var component;
        if (matchedBindings.component) {
          component = classFromDirectiveClass(matchedBindings.component);
        } else {
          component = null;
        }
        var compileElement = new CompileElement({
          element: node,
          level: parentElement.level + 1,
          attrs: matchedBindings.attrs,
          events: matchedBindings.events,
          decorators: matchedBindings.decorators.map(classFromDirectiveClass),
          component: component
        });
        if (matchedBindings.template) {
          nonElementBinder = this._compileTemplateDirective(node, matchedBindings.template, compileElement);
        } else {
          // don't recurse for template directives as they
          // change the node to a comment node.
          this.compileElements.push(compileElement);
          this.compileRecurse(node, compileElement);
        }
      } else if (nodeType == Node.TEXT_NODE) {
        nonElementBinder = this._compileTextNode(node, nodeIndex);
      }
      if (nonElementBinder) {
        parentElement.addNonElementBinder(nonElementBinder, nodeIndex);
      }
    }
  }
  _compileTextNode(node:Text):NonElementBinder {
    var bindExpression = this.selector.matchText(node);
    if (bindExpression) {
      return {
        // TODO: Test this!
        attrs: {
          init: {},
          bind: {'textContent': this.selector.matchText(node)},
        },
        events: null,
        template: null,
        indexInParent: -1
      };
    }
  }
  _compileTemplateDirective(node:HTMLElement, templateDirective:DirectiveClass,
    compileElement:CompileElement):NonElementBinder {

    this._replaceNodeWithComment(node, 'template anchor');

    var initialCompiledTemplateElement = null;
    var compileNodeContainer = node.content ? node.content : node;
    var templateNodeAttrs = compileElement.attrs;


    var templateContainer = compileNodeContainer;
    if (node.nodeName !== 'TEMPLATE') {
      templateContainer = document.createDocumentFragment();
      templateContainer = node.ownerDocument.createDocumentFragment();
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
    }
    var compiledTemplate = new CompileRun(this.selector, this.directiveClasses, initialCompiledTemplateElement)
      .compile(compileNodeContainer)
      .build(templateContainer);

    return {
      attrs: templateNodeAttrs,
      template: {
        directive: classFromDirectiveClass(templateDirective),
        compiledTemplate: compiledTemplate
      },
      indexInParent: -1
    };
  }
  _splitNodeAttrs(attrs, props:ArrayOfString) {
    var res = {
      init: {},
      bind: {}
    };
    props.forEach((propName) => {
      if (propName in attrs.init) {
        res.init[propName] = attrs.init[propName];
        delete attrs.init[propName];
      }
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
