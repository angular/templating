import {SimpleNodeContainer, ArrayLikeOfNodes, matchesSelector} from '../src/types';
import {$, $html} from './dom_mocks';

describe('types', ()=>{

  describe('matchesSelector', ()=>{
    it('should return false for non element nodes', ()=>{
      var node = $('a')[0];
      expect(matchesSelector(node, '*')).toBe(false);
    });

    it('should check element nodes', ()=>{
      var node = $('<div class="a" b="c"></div>')[0];
      
      expect(matchesSelector(node, '*')).toBe(true);
      expect(matchesSelector(node, 'div')).toBe(true);
      expect(matchesSelector(node, 'span')).toBe(false);
      expect(matchesSelector(node, '.a')).toBe(true);
      expect(matchesSelector(node, '.b')).toBe(false);
      expect(matchesSelector(node, '[b]')).toBe(true);
      expect(matchesSelector(node, '[c]')).toBe(false);
    });
  });
	 
  describe('SimpleNodeContainer', ()=>{

    it('should save the given nodes in the childNodes as an array', ()=>{
      var nodes = $('a<span></span>');
      var nc = new SimpleNodeContainer(nodes);
      expect(nc.childNodes).toEqual(Array.prototype.slice.call(nodes));
    });

    it('should not reparent the given nodes', ()=>{
      var container = $('<div>a<span></span></div>')[0];
      var nodes = container.childNodes;
      new SimpleNodeContainer(nodes);
      expect(nodes[0].parentNode).toBe(container);
    });

    it('should deep clone the nodes', ()=>{
      var nodesHtml = 'a<span></span>';
      var nodes = $(nodesHtml);
      var nc = new SimpleNodeContainer(nodes);
      var ncClone = nc.cloneNode(true);

      expect(ncClone).not.toBe(nc);
      ncClone.childNodes.forEach((node, index) => {
        expect(node).not.toBe(nc.childNodes[index]);
      });
      expect($html(ncClone.childNodes)).toEqual(nodesHtml);
    });

    it('should shallow clone the nodes', ()=>{
      var nodesHtml = 'a<span></span>';
      var nodes = $(nodesHtml);
      var nc = new SimpleNodeContainer(nodes);
      var ncClone = nc.cloneNode(false);

      expect(ncClone).not.toBe(nc);
      expect(ncClone.childNodes).not.toBe(nc.childNodes);
      expect(ncClone.childNodes).toEqual(nc.childNodes);
    });

    it('should check the nodes and their children on querySelectorAll', ()=>{
      var nodes = $('<div></div><div mark><span mark></span><span></span></div><div></div>');
      var nc = new SimpleNodeContainer(nodes);
      var foundNodes = nc.querySelectorAll('[mark]');
      expect(foundNodes.length).toBe(2);
      expect(foundNodes[0]).toBe(nodes[1]);
      expect(foundNodes[1]).toBe(nodes[1].childNodes[0]);

    });
  });
});
