import {ArrayLikeOfNodes, NodeAttrs} from './types';
import {DirectiveClass} from './directive_class';
import {ViewFactory, ElementBinder, NonElementBinder, 
  DirectiveClassWithViewFactory} from './view_factory';
import {Selector, SelectedElementBindings} from './selector/selector';
import {TemplateDirective} from './annotations';
import {TreeArray, reduceTree} from './tree_array';

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
    return new CompileRun(selector).compile(nodes).createViewFactory(nodes);
  }
}

class CompiledElement {
  constructor(
    element:HTMLElement = null,
    binder:ElementBinder = new ElementBinder(),
    parentElement:CompiledElement = null) {
    this.element = element;
    this.binder = binder;
    this.setParent(parentElement);
  }
  setParent(parentElement:CompiledElement) {
    this.level = parentElement ? parentElement.level + 1 : 0;    
  }
}

class ArrayOfCompiledElements {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(CompiledElement));
  }
  constructor() {
    throw new Error('not instantiable as just a type');
  }
}

class CompileRun {
  constructor(selector:Selector, initialCompiledElement:CompiledElement = null) {
    this.selector = selector;
    this.initialCompiledElement = initialCompiledElement;
  }
  compile(nodes:ArrayLikeOfNodes):CompileRun {
    // Always create a root CompiledElement for text nodes directly
    // on the root of the template
    this.compiledElements = [new CompiledElement()];
    if (this.initialCompiledElement) {
      this.compiledElements.push(this.initialCompiledElement);
      this.initialCompiledElement.setParent(this.compiledElements[0]);
    }
    this.compileRecurse(nodes, this.compiledElements[this.compiledElements.length-1]);
    return this;
  }
  createViewFactory(nodes:ArrayLikeOfNodes) {
    var binders = [];
    reduceTree(this.compiledElements, (parentLevel, compiledElement, index) => {
      var newLevel;
      var binder = compiledElement.binder;
      if (index === 0 || binder.hasBindings()) {
        newLevel = parentLevel+1;
        if (index>0) {
          if (compiledElement.element.className) {
            compiledElement.element.className += ' ng-binder';
          } else {
            compiledElement.element.className = 'ng-binder';
          }
        }
        binder.setLevel(newLevel);
        binders.push(binder);
      } else {
        newLevel = parentLevel;
      }
      return newLevel;
    }, -1);
    return new ViewFactory(nodes, binders);
  }
  compileRecurse(nodes:ArrayLikeOfNodes, parentElement:CompiledElement) {
    // variables that are used inside of the inner functions
    var nodeCount = nodes.length,
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
          component = this._compileComponentDirective(matchedBindings.component);
        }
        var binder = new ElementBinder({
          attrs: matchedBindings.attrs,
          decorators: matchedBindings.decorators,
          component: component
        });
        var compiledElement = new CompiledElement(node, binder, parentElement);
        if (matchedBindings.template) {
          nonElementBinder = this._compileTemplateDirective(node, matchedBindings.template, compiledElement);
        } else {
          // don't recurse for template directives as they
          // change the node to a comment node.
          compiledElement.treeIndex = this.compiledElements.length;
          this.compiledElements.push(compiledElement);
          this.compileRecurse(node.childNodes, compiledElement);
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
        attrs: new NodeAttrs({
          bind: {'text-content': this.selector.matchText(node)}
        })
      });          
    }    
  }
  _compileTemplateDirective(node:HTMLElement, templateDirective:DirectiveClass,
    compiledElement:CompiledElement):NonElementBinder {
    var initialCompiledTemplateElement = null;
    var childNodes = node.content ? node.content.childNodes : node.childNodes;

    var viewFactoryRoots = childNodes;
    if (node.nodeName !== 'TEMPLATE') {        
      viewFactoryRoots = [node];
      if (compiledElement.binder.hasBindings()) {
        // not a template element and the original element contains
        // other directives or bindings, besides the template directive. 
        // Then add the compiledElement as
        // part of the template.
        // TODO: split the attributes into those for the commend node and
        // those for the template

        initialCompiledTemplateElement = compiledElement;
      }
    }
    var viewFactory = new CompileRun(this.selector, initialCompiledTemplateElement)
      .compile(childNodes)
      .createViewFactory(viewFactoryRoots);

    this._replaceNodeWithComment(node, 'template anchor');

    // TODO: Split the attributes for the template directive and add them here!
    return new NonElementBinder({
      attrs: new NodeAttrs(),
      template: {
        directive: templateDirective,
        viewFactory: viewFactory
      }
    });
  }
  _replaceNodeWithComment(node, commentText) {
    var parent = node.parentNode;
    var comment = document.createComment(commentText);
    parent.insertBefore(comment, node);
    parent.removeChild(node);
    return comment;
  }
  _compileComponentDirective(componentDirective:DirectiveClass):DirectiveClassWithViewFactory {
    var template = componentDirective.annotation.template;
    var viewFactory;
    if (template instanceof ViewFactory) {
      viewFactory = template;
    } else {
      var templateContainer = document.createElement('div');
      templateContainer.innerHTML = template;
      viewFactory = new CompileRun(this.selector)
        .compile(templateContainer.childNodes)
        .createViewFactory(templateContainer.childNodes);
    }
    return {
      directive: componentDirective,
      viewFactory: viewFactory
    };
  }
}

