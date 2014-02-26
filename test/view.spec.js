import {use, inject} from 'di/testing';
import {ViewHole, View} from '../src/view';

describe('View', () => {
  var viewHole;
  var $rootElement;
  var anchorHtml = '<!-- anchor -->', 
      aHtml = '<span>A</span>a', 
      bHtml = '<span>B</span>b',
      cHtml = '<span>C</span>c',
      dHtml = '<span>D</span>d',
      anchor, a, b, c, d;

  beforeEach(() => {
    $rootElement = $('<div>'+anchorHtml+'</div>');
    anchor = $rootElement.contents()[0];
    viewHole = new ViewHole(anchor);
    a = new View($('<div>'+aHtml+'</div>').contents());
    b = new View($('<div>'+bHtml+'</div>').contents());
    c = new View($('<div>'+cHtml+'</div>').contents());
    d = new View($('<div>'+dHtml+'</div>').contents());
  });

  function expectChildNodesToEqual(nodes) {
    var str = nodes.join('');
    expect($rootElement.html()).toEqual(nodes.join(''));
  }

  describe('append', () => {
    it('should append in empty hole', () => {
      viewHole.append(a);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });

    it('should append in non empty hole', () => {
      viewHole.append(a);
      viewHole.append(b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

  });

  describe('prepend', () => {

    it('should prepend in empty hole', () => {
      viewHole.prepend(a);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });
  
    it('should prepend in non empty hole', () => {
      viewHole.prepend(b);
      viewHole.prepend(a);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

  });

  describe('insertBefore', () => {

    it('should insert before head', () => {
      viewHole.append(b);
      viewHole.insertBefore(a,b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should insert before other element', () => {
      viewHole.append(a);
      viewHole.append(c);
      viewHole.insertBefore(b,c);
      
      expectChildNodesToEqual([aHtml, bHtml, cHtml, anchorHtml]);
    });

  });

  describe('insertAfter', () => {

    it('should insert after tail', () => {
      viewHole.append(a);
      viewHole.insertAfter(b,a);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should insert before other element', () => {
      viewHole.append(a);
      viewHole.append(c);
      viewHole.insertAfter(b,a);
      
      expectChildNodesToEqual([aHtml, bHtml, cHtml, anchorHtml]);
    });

  });

  describe('remove', () => {
    it('should remove the only item in a hole', () => {
      viewHole.append(a);
      viewHole.remove(a);

      expectChildNodesToEqual([anchorHtml]);
    });

    it('should remove the last item of a hole', () => {
      viewHole.append(a);
      viewHole.append(b);
      viewHole.remove(b);

      expectChildNodesToEqual([aHtml, anchorHtml]);
    });

    it('should remove the first item of a hole', () => {
      viewHole.append(a);
      viewHole.append(b);
      viewHole.remove(a);

      expectChildNodesToEqual([bHtml, anchorHtml]);
    });
  });

  describe('move', () => {
    it('should switch head and tail', () => {
      viewHole.append(b);
      viewHole.append(a);
      viewHole.insertBefore(a, b);

      expectChildNodesToEqual([aHtml, bHtml, anchorHtml]);
    });

    it('should move an element in the hole', () => {
      viewHole.append(a);
      viewHole.append(c);
      viewHole.append(b);
      viewHole.append(d);
      viewHole.insertBefore(b,c);

      expectChildNodesToEqual([aHtml, bHtml, cHtml, dHtml, anchorHtml]);
    });

  });    
});
