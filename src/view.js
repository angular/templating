import {NodeContainer} from './node_container';
import {LinkedList} from './linked_list';
import {LinkedListItem} from './linked_list';
import {Injector} from 'di/injector';

/*
 * View represents a DOM with bound Directives. 
 * Views are added to the ViewPort by the template directives 
 * such as ng-if and ng-repeat.
 */
export class View extends LinkedListItem {
  constructor(container:NodeContainer, injector:Injector) {
    super();
    this.injector = injector;
    // Save references to the nodes so that we can insert
    // them back into the fragment later...
    this.nodes = Array.prototype.slice.call(container.childNodes);
    if (container.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      this._fragment = container;
      this.removed = true;
    } else {
      this._fragment = new DocumentFragment();
      this.removed = false;
    }
  }
  _removeIfNeeded() {
    if (!this.removed) {
      this.removed = true;
      this.nodes.forEach((node) => { this._fragment.appendChild(node); });
    }
  }
  insertBefore(refNode:Node) {
    var parent = refNode.parentNode;
    this._removeIfNeeded();
    parent.insertBefore(this._fragment, refNode);
    this.removed = false;
  }
  appendTo(node:Node) {
    this._removeIfNeeded();
    node.appendChild(this._fragment);
    this.removed = false;
  }
}

export class ViewPort  {
  constructor(anchor:Comment) {
    this.anchor = anchor;
    this.list = new LinkedList();
  }
  append(view:View) {
    view.insertBefore(this.anchor);
    this.list.append(view);
  }
  insertBefore(view:View, referenceView:View) {
    view.insertBefore(referenceView.nodes[0]);
    this.list.insertBefore(view, referenceView);
  }
  prepend(view:View) {
    if (this.list.head) {
      this.insertBefore(view, this.list.head);
    } else {
      this.append(view);
    }
  }
  insertAfter(view:View, referenceView:View) {
    if (!referenceView.next) {
      this.append(view);
    } else {
      this.insertBefore(view, referenceView.next);
    }
  }

  // TODO: destroy the injector of the view as well here
  // TODO: Provide a hook for DI objects (e.g. event_handler)
  // to be notified about the destruction of the injector.
  remove(view:View) {
    this.list.remove(view);
    view._removeIfNeeded();
  }
}
