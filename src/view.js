import {ArrayLikeOfNodes} from './types';
import {LinkedList} from './linked_list';
import {LinkedListItem} from './linked_list';
import {Injector} from 'di/injector';

/*
 * View represents a DOM with bound Directives. 
 * Views are added to the ViewPort by the template directives 
 * such as ng-if and ng-repeat.
 */
export class View extends LinkedListItem {
  constructor(templateNodes:ArrayLikeOfNodes, injector:Injector) {
    super();
    this.injector = injector;
    // clone every node separately as they might now
    // belong to a common parent
    this.nodes = [];
    for (var i=0, ii=templateNodes.length; i<ii; i++) {
      this.nodes.push(templateNodes[i].cloneNode(true));
    }
    this.fragment = new DocumentFragment();
    this._removeIfNeeded();
  }
  _removeIfNeeded() {
    if (!this.removed) {
      this.removed = true;
      this.nodes.forEach((node) => { this.fragment.appendChild(node); });
    }
  }
  insertBefore(refNode:Node) {
    var parent = refNode.parentNode;
    this._removeIfNeeded();
    parent.insertBefore(this.fragment, refNode);
    this.removed = false;
  }
  appendTo(element:HTMLElement) {
    this._removeIfNeeded();
    element.appendChild(this.fragment);
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
    view.nodes.forEach((node) => { view.fragment.appendChild(node); });
  }
}
