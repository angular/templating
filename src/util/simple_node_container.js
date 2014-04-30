import {ArrayLikeOfNodes} from '../types';

/**
 * A node container just like DocumentFragment,
 * but which does not "own" the child nodes in that
 * they can belong to other nodes as parents.
 */
export class SimpleNodeContainer {
  constructor(nodes:ArrayLikeOfNodes) {
    this.childNodes = Array.prototype.slice.call(nodes);
    this.nodeType = -1;
  }
}
