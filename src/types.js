import {assert} from 'assert';
import {Injector} from 'di/injector';

export class ArrayLikeOfNodes {
  static assert(obj) {
    assert(obj.length).is(assert.number);
    for (var i=0, ii=obj.length; i<ii; i++) {
      assert(obj[i]).is(Node);
    }
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}

export class ArrayOfObject {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(assert.object));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}

export class ArrayOfString {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(assert.string));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}

export class NodeAttrs {
  constructor(data = {}) {
    this.init = data.init || {};
    this.bind = data.bind || {};
    this.event = data.event || {};
  }
}

export class ArrayOfClass {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(Function));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}

export class NodeContainer {
  static assert(obj) {
    assert(obj).is(assert.structure({
      cloneNode: Function,
      // getElementsByClassName would be nicer,
      // however, documentFragments only support
      // querySelectorAll and not getElementsByClassName
      querySelectorAll: Function,
      childNodes: ArrayLikeOfNodes,
      nodeType: assert.number
    }));
  }
}

/**
 * A node container just like DocumentFragment,
 * but which does not "own" the child nodes in that
 * they can belong to other nodes as parents.
 * This is important for "inplace" compile runs
 * without cloning elements.
 */
export class SimpleNodeContainer {
  constructor(nodes:ArrayLikeOfNodes) {
    this.childNodes = Array.prototype.slice.call(nodes);
    this.nodeType = -1;
  }
  cloneNode(deepClone) {
    var clonedNodes;
    if (!deepClone) {
      clonedNodes = Array.prototype.slice.call(this.childNodes);
    } else {
      clonedNodes = this.childNodes.map((node) => { return node.cloneNode(deepClone); });
    }
    return new SimpleNodeContainer(clonedNodes);
  }
  querySelectorAll(selector) {
    var res = [];
    var matchesFnNames = ['matches', 'matchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'];
    this.childNodes.forEach((node) => {
      if (matchesSelector(node, selector)) {
        res.push(node);
      }
      if (node.querySelectorAll) {
        res.push(...node.querySelectorAll(selector));
      }
    });
    return res;
  }
}

var matchesSelectorFnName = findMatchesSelectorFnName();
function findMatchesSelectorFnName() {
  var res = null;
  var el = document.createElement('div');
  ['matches', 'matchesSelector', 'mozMatchesSelector', 'msMatchesSelector', 'oMatchesSelector'].forEach((fnName)=>{
      if (!res && el[fnName]) {
        res = fnName;
      }
  });
  if (!res) {
    throw new Error('matchesSelector is not supported on this platform!');
  }
  return res;
}

export function matchesSelector(node, selector) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return false;
  }
  return node[matchesSelectorFnName](selector);
}
