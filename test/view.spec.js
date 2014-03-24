import {use, inject} from 'di/testing';
import {Injector} from 'di/injector';
import {ViewPort, View, RootView} from '../src/view';
import {$, $html} from './dom_mocks';
import {NgNode} from '../src/ng_node';
import {RootWatchGroup} from 'watchtower/watch_group';

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
    a = new RootView($('<div>'+aHtml+'</div>')[0], new Injector());
    b = new RootView($('<div>'+bHtml+'</div>')[0], new Injector());
    c = new RootView($('<div>'+cHtml+'</div>')[0], new Injector());
    d = new RootView($('<div>'+dHtml+'</div>')[0], new Injector());
  });

  function expectChildNodesToEqual(nodes) {
    var str = nodes.join('');
    expect($html($rootElement)).toEqual(nodes.join(''));
  }

  describe('constructor', ()=>{

    it('should save the nodes into an array that does not change when adding the nodes to the DOM', ()=>{
      var container = $('<div>a</div>')[0];
      var node = container.childNodes[0];
      var v = new RootView( container, new Injector());
      container.removeChild(node);
      expect(v.nodes).toEqual([node]);
    });

    it('should not reparent the nodes when given an element (important for link without clones)', ()=>{
      var container = $('<div>a</div>')[0];
      var node = container.childNodes[0];
      var v = new RootView( container, new Injector());
      expect(node.parentNode).toBe(container);
    });

    it('should not reparent the nodes when given a fragment (important for link without clones)', ()=>{
      var container = document.createDocumentFragment();
      var node = $('a')[0];
      container.appendChild(node);
      var v = new RootView( container, new Injector());
      expect(node.parentNode).toBe(container);
    });

    it('should reuse a given fragment as internal fragment', ()=>{
      var container = document.createDocumentFragment();
      var node = $('a')[0];
      container.appendChild(node);
      var v = new RootView( container, new Injector());
      expect(v._fragment).toBe(container);
    });

    it('should set the parentView and the rootView', ()=>{
      var container = document.createDocumentFragment();
      var injector = new Injector();
      var v1 = new RootView(container, injector);
      
      expect(v1.parentView).toBe(null);
      expect(v1.rootView).toBe(v1);

      var v2 = new View(v1, container, injector);
      expect(v2.parentView).toBe(v1);
      expect(v2.rootView).toBe(v1);

      var v3 = new View(v2, container, injector);
      expect(v3.parentView).toBe(v2);
      expect(v2.rootView).toBe(v1);
    });

    it('should set the parser and the watchParser', ()=>{
      var container = document.createDocumentFragment();
      var injector = new Injector();
      var v1 = new RootView(container, injector);
      expect(v1.parser).toBeDefined();
      expect(v1.watchParser).toBeDefined();
      
      var v2 = new View(v1, container, injector);
      expect(v2.parser).toBe(v1.parser);
      expect(v2.watchParser).toBe(v1.watchParser);
    });

    it('should create a watchGroup', ()=>{
      var container = document.createDocumentFragment();
      var injector = new Injector();
      var v1 = new RootView(container, injector);
      expect(v1.watchGrp.constructor).toBe(RootWatchGroup);
      
      var v2 = new View(v1, container, injector);
      expect(v2.watchGrp._parentWatchGroup).toBe(v1.watchGrp);
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

  describe('evaluate', ()=>{

    it('should evaluate the expression in the view executionContext if no context is given', ()=>{
      a.executionContext.someProp = 'someValue';
      expect(a.evaluate('someProp')).toBe('someValue');
    });

    it('should evaluate the expression in the given executionContext', ()=>{
      var context = {
        someProp: 'anotherValue'
      };
      a.executionContext.someProp = 'someValue';
      expect(a.evaluate('someProp', context)).toBe('anotherValue');
    });

  });

  describe('assign', ()=>{

    it('should assign the expression in the view executionContext if no context is given', ()=>{
      a.assign('someProp', 'someValue');
      expect(a.executionContext.someProp).toBe('someValue');
    });

    it('should assign the expression in the given executionContext', ()=>{
      var context = {};
      a.assign('someProp', 'someValue', context)
      expect(context.someProp).toBe('someValue');
    });

  });

  describe('watch', ()=>{

    it('should watch the expression in the view executionContext if no context is given', ()=>{
      var callback = jasmine.createSpy('callback');
      a.watch('someProp', callback);      

      a.executionContext.someProp = 'someValue';
      a.digest();
      expect(callback).toHaveBeenCalledWith('someValue', undefined);
      
      a.executionContext.someProp = 'anotherValue';
      a.digest();
      expect(callback).toHaveBeenCalledWith('anotherValue', 'someValue');
    });

    it('should watch the expression in the given context', ()=>{
      var context = {};
      var callback = jasmine.createSpy('callback');
      a.watch('someProp', callback, context);

      context.someProp = 'someValue';
      a.digest();
      expect(callback).toHaveBeenCalledWith('someValue', undefined);
      
      context.someProp = 'anotherValue';
      a.digest();
      expect(callback).toHaveBeenCalledWith('anotherValue', 'someValue');
    });

    it('should watch expressions in child views', ()=>{
      var childView = new View(a, document.createElement('a'), a.injector);
      childView.executionContext.someProp = 'someValue';
      var callback = jasmine.createSpy('callback');
      childView.watch('someProp', callback);
      a.digest();

      expect(callback).toHaveBeenCalledWith('someValue', undefined);
    });

  });

  describe('digest', ()=>{
    
    it('should check the watchGrp for changes', () => {
      spyOn(a.watchGrp, 'detectChanges');
      a.digest();
      expect(a.watchGrp.detectChanges).toHaveBeenCalled();
    });

    it('should flush all dirty nodes and then remove them from the list', ()=>{
      var node = document.createElement('a');
      var ngNode = new NgNode(node, {
        view: a
      });
      spyOn(ngNode, 'flush');
      ngNode.prop('textContent', 'someText');
      expect(a.dirtyNodes).toEqual([ngNode]);

      a.digest();

      expect(ngNode.flush).toHaveBeenCalled();
      expect(a.dirtyNodes).toEqual([]);        
    });
  });

  describe('destroy', ()=>{

    it('should remove the watchGroup', ()=>{
      var root = new RootView($('<div></div>')[0], new Injector());
      spyOn(root.watchGrp, 'remove').and.callThrough();
      root.destroy();
      expect(root.watchGrp.remove).not.toHaveBeenCalled();

      var childView = new View(root, $('<div></div>')[0], new Injector());
      spyOn(childView.watchGrp, 'remove').and.callThrough();

      childView.destroy();
      expect(childView.watchGrp.remove).toHaveBeenCalled();
    });

    it('should throw when working with a destroyed view', ()=>{
      var expectedError = new Error('This view has been destroyed and can not be used any more');
      var a = new RootView($('<div></div>')[0], new Injector());
      a.destroy();

      expect(()=>{
        viewPort.append(a);  
      }).toThrow(expectedError);
      
      expect(()=>{
        viewPort.remove(a);  
      }).toThrow(expectedError);

      expect(()=>{
        viewPort.remove(a);  
      }).toThrow(expectedError);

      expect(()=>{
        a.watch('someExpr', null);  
      }).toThrow(expectedError);

      expect(()=>{
        a.evaluate('someExpr');
      }).toThrow(expectedError);

      expect(()=>{
        a.assign('someExpr', null);
      }).toThrow(expectedError);
    });
  });
});
