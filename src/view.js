import {ArrayLikeOfNodes} from './types';
import {LinkedList} from './linked_list';
import {LinkedListItem} from './linked_list';

export class View extends LinkedListItem {
  constructor(elements:ArrayLikeOfNodes) {
    super();
    this.elements = elements;
  }
}

export class ViewHole  {
  constructor(anchor:Comment) {
    this.anchor = anchor;
    this.list = new LinkedList();
  }

  _insertBeforeElements(elements:ArrayLikeOfNodes, beforeNode:Node) {
    var parent = this.anchor.parentNode;
    for(var i=0, ii=elements.length; i<ii; i++) {
      parent.insertBefore(elements[i], beforeNode);
    }
  }

  append(view:View) {
    this._insertBeforeElements(view.elements, this.anchor);
    this.list.append(view);
  }

  insertBefore(view:View, referenceView:View) {
    this._insertBeforeElements(view.elements, referenceView.elements[0]);
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

  remove(view:View) {
    this.list.remove(view);
    var elements = view.elements;
    var parent = this.anchor.parentNode;
    for(var i=0, ii=elements.length; i<ii; i++) {
      parent.removeChild(elements[i]);
    }
  }
}
