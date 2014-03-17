import {use, inject} from 'di/testing';
import {ViewPort, View} from '../src/view';
import {$, $html} from './dom_mocks';

describe('View', () => {
  var viewPort;
  var $rootElement;
  var anchorHtml = '<!-- anchor -->', 
      aHtml = '<span>A</span>a', 
      bHtml = '<span>B</span>b',
      cHtml = '<span>C</span>c',
      dHtml = '<span>D</span>d',
      anchor, a, b, c, d;

  beforeEach(() => {
    $rootElement = $(anchorHtml);
    anchor = $rootElement[0];
    viewPort = new ViewPort(anchor);
    a = new View($('<div>'+aHtml+'</div>')[0], null);
    b = new View($('<div>'+bHtml+'</div>')[0], null);
    c = new View($('<div>'+cHtml+'</div>')[0], null);
    d = new View($('<div>'+dHtml+'</div>')[0], null);
  });

  function expectChildNodesToEqual(nodes) {
    var str = nodes.join('');
    expect($html($rootElement)).toEqual(nodes.join(''));
  }

  describe('constructor', ()=>{

    it('should save the nodes into an array that does not change when adding the nodes to the DOM', ()=>{
      var container = $('<div>a</div>')[0];
      var node = container.childNodes[0];
      var v = new View(container, null);
      container.removeChild(node);
      expect(v.nodes).toEqual([node]);
    });

    it('should not reparent the nodes when given an element (important for link without clones)', ()=>{
      var container = $('<div>a</div>')[0];
      var node = container.childNodes[0];
      var v = new View(container, null);
      expect(node.parentNode).toBe(container);
    });

    it('should not reparent the nodes when given a fragment (important for link without clones)', ()=>{
      var container = document.createDocumentFragment();
      var node = $('a')[0];
      container.appendChild(node);
      var v = new View(container, null);
      expect(node.parentNode).toBe(container);
    });

    it('should reuse a given fragment as internal fragment', ()=>{
      var container = document.createDocumentFragment();
      var node = $('a')[0];
      container.appendChild(node);
      var v = new View(container, null);
      expect(v._fragment).toBe(container);
    });
  });

  describe('appendTo', ()=>{

    it('should append the nodes to an element', ()=>{
      var el = $('<div></div>')[0];
      a.appendTo(el);
      expect(el.innerHTML).toBe(aHtml);
    });

    it('should append the nodes to a fragment', ()=>{
      var df = document.createDocumentFragment();
      a.appendTo(df);
      expect($html(df.childNodes)).toBe(aHtml);
    });

  });


  describe('append', () => {
    it('should append in empty hole', () => {
      viewPort.append(a);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });

    it('should append in non empty hole', () => {
      viewPort.append(a);
      viewPort.append(b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

  });

  describe('prepend', () => {

    it('should prepend in empty hole', () => {
      viewPort.prepend(a);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });
  
    it('should prepend in non empty hole', () => {
      viewPort.prepend(b);
      viewPort.prepend(a);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

  });

  describe('insertBefore', () => {

    it('should insert before head', () => {
      viewPort.append(b);
      viewPort.insertBefore(a,b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should insert before other element', () => {
      viewPort.append(a);
      viewPort.append(c);
      viewPort.insertBefore(b,c);
      
      expectChildNodesToEqual([aHtml, bHtml, cHtml, anchorHtml]);
    });

  });

  describe('insertAfter', () => {

    it('should insert after tail', () => {
      viewPort.append(a);
      viewPort.insertAfter(b,a);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should insert before other element', () => {
      viewPort.append(a);
      viewPort.append(c);
      viewPort.insertAfter(b,a);
      
      expectChildNodesToEqual([aHtml, bHtml, cHtml, anchorHtml]);
    });

  });

  describe('remove', () => {
    it('should remove the only item in a hole', () => {
      viewPort.append(a);
      viewPort.remove(a);

      expectChildNodesToEqual([anchorHtml]);
    });

    it('should remove the last item of a hole', () => {
      viewPort.append(a);
      viewPort.append(b);
      viewPort.remove(b);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });

    it('should remove the first item of a hole', () => {
      viewPort.append(a);
      viewPort.append(b);
      viewPort.remove(a);

      expectChildNodesToEqual([bHtml, anchorHtml]);
    });
  });

  describe('move', () => {
    it('should switch head and tail', () => {
      viewPort.append(b);
      viewPort.append(a);
      viewPort.insertBefore(a, b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should move an element in the hole', () => {
      viewPort.append(a);
      viewPort.append(c);
      viewPort.append(b);
      viewPort.append(d);
      viewPort.insertBefore(b,c);

      expectChildNodesToEqual([aHtml, bHtml, cHtml, dHtml, anchorHtml]);
    });

  });    
});
