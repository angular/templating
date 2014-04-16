import {NodeAttrs, ArrayOfClass, ArrayLikeOfNodes, ArrayOfString} from '../types';
import {NodeContainer, SimpleNodeContainer} from '../node_container';
import {DirectiveClass, ArrayOfDirectiveClass} from './directive_class';
import {ViewFactory, ElementBinder, NonElementBinder} from '../view_factory';
import {Selector, SelectedElementBindings} from './selector';
import {TemplateDirective} from '../annotations';
import {TreeArray, reduceTree} from '../tree_array';
import {Inject} from 'di';
import {CompilerConfig} from './compiler_config';

/*
 * Compiler walks the DOM and calls Selector.match on each node in the tree.
 * It collects the resulting ElementBinders and stores them in tree which mimics
 * the DOM structure for easy invocation of ElementBinder.bind on view clone.
 * The resulting list of ElementBinders as well as the templ Node is returned as a ViewFactory.
 *
 * Lifetime: immutable for the duration of application.
 */
export class Compiler {
  @Inject(CompilerConfig)
  constructor(config:CompilerConfig) {
    this.config = config;
  }

  compileNodes(nodes:ArrayLikeOfNodes, directives: ArrayOfClass):ViewFactory {
    return this.compileChildNodes(new SimpleNodeContainer(nodes), directives);
  }

  // Note: We are passing in a container and not an array of nodes
  // as this makes cloning and finding nodes (querySelectorAll) faster,
  // as we don't have to loop over the children but only call the methods
  // on the container!
  compileChildNodes(container:NodeContainer, directives:ArrayOfClass):ViewFactory {
    var directiveClasses = this.config.directiveClassesForDirectives(directives);
    return this._compileChildNodes(container,
      new Selector(directiveClasses, this.config)
    );
  }
  _compileChildNodes(container:NodeContainer, selector:Selector):ViewFactory {
    return new CompileRun(selector).compile(container).createViewFactory(container);
  }
}

class CompileElement {
  constructor(
    element:HTMLElement,
    binder:ElementBinder,
    level:number) {
    this.element = element;
    this.binder = binder;
    this.level = level;
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
    this.compileElements = [new CompileElement(null, new ElementBinder(), 0)];
    if (this.initialCompileElement) {
      this.compileElements.push(this.initialCompileElement);
      this.initialCompileElement.level = 1;
    }
    this.compileRecurse(container, this.compileElements[this.compileElements.length-1]);
    return this;
  }
  createViewFactory(container:NodeContainer) {
    var binders = [];
    reduceTree(this.compileElements, collectNonEmptyBindersAndCalcBinderTreeLevel, -1);

    return new ViewFactory(container, binders);

    function collectNonEmptyBindersAndCalcBinderTreeLevel(parentLevel, compileElement, index) {
      var newLevel;
      var binder = compileElement.binder;
      if (index === 0 || binder.hasBindings()) {
        newLevel = parentLevel+1;
        if (index>0) {
          if (compileElement.element.className) {
            compileElement.element.className += ' ng-binder';
          } else {
            compileElement.element.className = 'ng-binder';
          }
        }
        binder.setLevel(newLevel);
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
        var matchedBindings = this.selector.matchElement(node);
        var component;
        if (matchedBindings.component) {
          component = classFromDirectiveClass(matchedBindings.component);
        } else {
          component = null;
        }
        var binder = new ElementBinder({
          attrs: matchedBindings.attrs,
          decorators: matchedBindings.decorators.map(classFromDirectiveClass),
          component: component
        });
        var compileElement = new CompileElement(node, binder, parentElement.level + 1);
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
        parentElement.binder.addNonElementBinder(nonElementBinder, nodeIndex);
      }
    }
  }
  _compileTextNode(node:Text) {
    var bindExpression = this.selector.matchText(node);
    if (bindExpression) {
      return new NonElementBinder({
        // TODO: Test this!
        attrs: new NodeAttrs({
          bind: {'textContent': this.selector.matchText(node)}
        })
      });
    }
  }
  _compileTemplateDirective(node:HTMLElement, templateDirective:DirectiveClass,
    compileElement:CompileElement):NonElementBinder {

    this._replaceNodeWithComment(node, 'template anchor');

    var initialCompiledTemplateElement = null;
    var templateContainer = node.content ? node.content : node;
    var templateNodeAttrs = compileElement.binder.attrs;

    var viewFactoryRoot = templateContainer;
    if (node.nodeName !== 'TEMPLATE') {
      viewFactoryRoot = document.createDocumentFragment();
      viewFactoryRoot = node.ownerDocument.createDocumentFragment();
      viewFactoryRoot.appendChild(node);
      if (compileElement.binder.hasBindings()) {
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

      templateNodeAttrs = compileElement.binder.attrs.split(bindAttrNames);
    }
    var viewFactory = new CompileRun(this.selector, initialCompiledTemplateElement)
      .compile(templateContainer)
      .createViewFactory(viewFactoryRoot);

    return new NonElementBinder({
      attrs: templateNodeAttrs,
      template: {
        directive: classFromDirectiveClass(templateDirective),
        viewFactory: viewFactory
      }
    });
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
