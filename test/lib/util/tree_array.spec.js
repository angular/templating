import {reduceTree} from '../../../src/lib/util/tree_array';

describe('tree array', () => {
  describe('reduceTree', ()=>{
    it('should not iterate over empty tree', ()=>{
      var spy = jasmine.createSpy('callback');
      reduceTree([], null, spy);
      expect(spy).not.toHaveBeenCalled();
    });

    it('should loop over the paths from left-to-right and top-to-bottom', () => {
      function collectPaths(path, node) {
        return [].concat(path).concat(node.n);
      }

      var paths = reduceTree([{level: 0, n: 1}, {level: 1, n: 2}, {level: 0, n: 3}], collectPaths, []);
      expect(paths.length).toBe(2);
      expect(paths[0].join(',')).toBe('1,2');
      expect(paths[1].join(',')).toBe('3');
    });

    it('should provide the node indices', ()=>{
      var indices = [];
      function collectPaths(path, node, index) {
        indices.push(index);
      }

      reduceTree([{level: 0, n: 1}, {level: 1, n: 2}, {level: 0, n: 3}], collectPaths);
      expect(indices.join(',')).toBe('0,1,2');
    });

  });
});
