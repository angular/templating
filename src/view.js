import {ArrayLikeOfNodes} from './types';
import {LinkedList} from './linked_list';
import {LinkedListItem} from './linked_list';

/*
 * View represents a DOM with bound Directives. 
 * Views are added to the ViewPort by the template directives 
 * such as ng-if and ng-repeat.
 */
export class View extends LinkedListItem {
  constructor(nodes:ArrayLikeOfNodes) {
    super();
    this.nodes = nodes;
  }
  insertBefore(refNode:Node) {
    var parent = refNode.parentNode;
    for(var i=0, ii=this.nodes.length; i<ii; i++) {
      parent.insertBefore(this.nodes[i], refNode);
    }
  }
  appendTo(el:HTMLElement) {
    for(var i=0, ii=this.nodes.length; i<ii; i++) {
      el.appendChild(this.nodes[i]);
    }    
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

  remove(view:View) {
    this.list.remove(view);
    var nodes = view.nodes;
    var parent = this.anchor.parentNode;
    for(var i=0, ii=nodes.length; i<ii; i++) {
      parent.removeChild(nodes[i]);
    }
  }
}
