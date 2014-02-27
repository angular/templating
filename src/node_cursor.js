import {ArrayLikeOfNodes} from './types';

export class NodeCursor {

  constructor(elements:ArrayLikeOfNodes) {
    this.index = 0;
    this.stack = [];
    this.elements = elements;
  }

  isValid() { 
    return this.index < this.elements.length; 
  }

  currentNode() {
    return this.isValid() ? this.elements[this.index] : null;
  }

  microNext() {
    var length = this.elements.length;

    if (this.index < length) {
      this.index++;
    }

    return this.index < length;
  }

  descend() {
    var childNodes = this.elements[this.index].childNodes;
    var hasChildren = childNodes != null && childNodes.length > 0;

    if (hasChildren) {
      this.stack.push(this.index);
      this.stack.push(this.elements);
      this.elements = Array.prototype.slice.call(childNodes);
      this.index = 0;
    }

    return hasChildren;
  }

  ascend() {
    this.elements = this.stack.pop();
    this.index = this.stack.pop();
  }

  insertAnchorBefore(name:string) {
    var current = this.elements[this.index];
    var parent = current.parentNode;

    var anchor = document.createComment(`ANCHOR: ${name}`);

    this.elements.splice(this.index++, 0, anchor);

    if (parent != null) {
      parent.insertBefore(anchor, current);
    }
  }

  replaceWithAnchor(name:string) {
    this.insertAnchorBefore(name);
    var childCursor = this.remove();
    this.index--;
    return childCursor;
  }

  remove() {
    var node = this.currentNode();
    this.elements.splice(this.index, 1);
    node.remove();
    return new NodeCursor([node]);
  }
}