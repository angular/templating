import {NodeInjector} from './di/node_injector';
import {ArrayLikeOfNodes} from './types';

/*
 * View represents a set of nodes with configured directives.
 */
export class View {
  constructor(nodes:ArrayLikeOfNodes, injector:NodeInjector) {
    super();
    this.injector = injector;
    // Save references to the nodes so that we can insert
    // them back into the fragment later...
    this._nodes = Array.prototype.slice.call(nodes);
    if (nodes[0].parentNode && nodes === nodes[0].parentNode.childNodes && nodes[0].parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      this._fragment = nodes[0].parentNode;
      this._removed = true;
    } else {
      this._fragment = document.createDocumentFragment();
      this._removed = false;
    }
  }
  remove() {
    this._removeIfNeeded();
    this.injector.remove();
  }
  insertBeforeView(refView:View) {
    this.injector.insertBefore(refView.injector);
    this._insertBeforeNode(refView._nodes[0]);
  }
  insertAfterView(refView:View) {
    this.injector.insertAfter(refView.injector);
    this._insertAfterNode(refView._nodes[refView._nodes.length-1]);
  }
  appendTo(viewPort:ViewPort) {
    this._insertAfterNode(viewPort._anchorNode);
    this.injector.appendTo(viewPort._anchorInjector);
  }
  _removeIfNeeded() {
    if (!this._removed) {
      this._removed = true;
      this._nodes.forEach((node) => { this._fragment.appendChild(node); });
    }
  }
  _insertBeforeNode(refNode:Node) {
    this._insert(refNode.parentNode, (parent, df) => {
      parent.insertBefore(df, refNode);
    });
  }
  _insertAfterNode(refNode:Node) {
    var nextNode = refNode.nextSibling;
    if (!nextNode) {
      this._appendToNode(refNode.parentNode);
    } else {
      this._insertBeforeNode(nextNode);
    }
  }
  _appendToNode(parent:Node) {
    this._insert(parent, (parent, df) => {
      parent.appendChild(df);
    });
  }
  _insert(parent, impl) {
    this._removeIfNeeded();
    impl(parent, this._fragment);
    this._removed = false;
  }
}

export class ViewPort {
  constructor(anchorNode:HTMLElement, anchorInjector) {
    this._anchorNode = anchorNode;
    this._anchorInjector = anchorInjector;
  }
}