import {assert} from 'rtts-assert';
import {TreeArray} from '../types';

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