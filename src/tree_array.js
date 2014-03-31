import {assert} from 'rtts-assert';

export class TreeArrayNode {
  static assert(obj) {
    assert(obj).is(assert.structure({
      level: assert.number
    }));
  }
  constructor() {
    throw new Error('not instantiable');
  }
}

/**
 * An array of TreeArrayNodes that represent a valid depth-first-tree.
 */
export class TreeArray {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(TreeArrayNode));
    var prevLevel = -1;
    obj.forEach((node) => {
      var newLevel = node.level;
      if (newLevel === null) {
        assert.fail('level must be set');
      }
      if (newLevel<0) {
        assert.fail('level must be >=0');
      }
      if (newLevel>=prevLevel && newLevel-prevLevel > 1) {
        assert.fail("levels can't be skipped");
      }
      prevLevel = newLevel;
    });
  }
  constructor() {
    throw new Error('not instantiable');
  }
}

/**
 * The reduce() method applies a function against an accumulator and all
 * nodes of the paths of the tree (from left-to-right and top-to-bottom).
 * The result is an array with the last accumulated value for every path.
 * @param {function} callback:
 *   Function to execute on each value in the array, taking four arguments:
 *   - previousValue
 *     The value previously returned in the last invocation of the callback, or initialValue, if supplied. (See below.)
 *   - node
 *     The current element being processed in the array.
 *   - index
 *     The index of the current element being processed in the array.
 * @param {object=} initialValue
 *   Object to use as the first argument to the first call of the callback.
 */
export function reduceTree(tree:TreeArray, reduceCallback, initValue = null) {
  var stack = [],
    i,    
    currNode, prevValue,
    leafeValues = [];
  for (i=0; i<tree.length; i++) {
    currNode = tree[i];

    if (stack.length > currNode.level) {
      leafeValues.push(stack[stack.length-1]);
    }

    stack.splice(currNode.level, stack.length - currNode.level);
    prevValue = stack.length ? stack[stack.length-1] : initValue;
    stack.push(reduceCallback(prevValue, currNode, i, tree));
  }
  leafeValues.push(stack[stack.length-1]);
  return leafeValues;
}
