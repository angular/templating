import {NgNode} from '../src/ng_node';
import {$} from './dom_mocks';

describe('ng_node', ()=>{

  it('should store extra data', ()=>{
    var data = {};
    var node = new NgNode(document.createElement('span'),data);
    expect(node.data()).toBe(data);
  });

  it('should return the native node', ()=>{
    var node = document.createElement('span');
    var ngNode = new NgNode(node);
    expect(ngNode.nativeNode()).toBe(node);
  });

  it('should save itself on the node', ()=>{
    var node = document.createElement('span');
    var ngNode = new NgNode(node);
    expect(node.ngNode).toBe(ngNode);
  });

  describe('property access', ()=>{
    var nativeObj, ngNode, somePropGetter, somePropSetter;

    beforeEach(()=>{
      nativeObj = document.createElement('span');
      somePropGetter = jasmine.createSpy('get');
      somePropSetter = jasmine.createSpy('set');
      Object.defineProperty(nativeObj, 'someProp', {
        get: somePropGetter, set: somePropSetter
      });
      ngNode = new NgNode(nativeObj);
    });
    
    it('reads the native property', ()=>{
      somePropGetter.and.returnValue('someValue');
      expect(ngNode.prop('someProp').value).toBe('someValue');
    });

    it('caches reads to the native property', ()=>{
      somePropGetter.and.returnValue('someValue');
      expect(ngNode.prop('someProp').value).toBe('someValue');
      expect(ngNode.prop('someProp').value).toBe('someValue');
      expect(somePropGetter.calls.count()).toBe(1);
    });

    it('caches writes to the native property', ()=>{
      ngNode.prop('someProp').value = 'someValue';
      expect(ngNode.prop('someProp').value).toBe('someValue');
      expect(somePropGetter.calls.count()).toBe(0);
      expect(somePropSetter.calls.count()).toBe(0);
    });

    it('flushes the cached writes to the native property only once', ()=>{
      ngNode.prop('someProp').value = 'someValue';
      ngNode.flush();
      ngNode.flush();
      
      expect(somePropSetter.calls.count()).toBe(1)
      expect(somePropSetter).toHaveBeenCalledWith('someValue');
    });

    it('returns the changed properties on flush', ()=>{
      ngNode.prop('someProp').value = 'someValue';
      expect(ngNode.flush().props).toEqual({someProp: 'someValue'});
    });

    it('sets the dirty flag when a property is set and clears it on flush', ()=>{
      expect(ngNode.isDirty()).toBe(false);
      ngNode.prop('someProp').value = 'someValue';
      expect(ngNode.isDirty()).toBe(true);
      ngNode.flush();
      expect(ngNode.isDirty()).toBe(false);
    });    
  });  

  describe('style access', ()=>{
    var nativeObj, ngNode, somePropGetter, somePropSetter;

    beforeEach(()=>{
      nativeObj = document.createElement('span');
      somePropGetter = jasmine.createSpy('get');
      somePropSetter = jasmine.createSpy('set');
      Object.defineProperty(nativeObj.style, 'someProp', {
        get: somePropGetter, set: somePropSetter
      });
      ngNode = new NgNode(nativeObj);
    });
    
    it('reads the native style', ()=>{
      somePropGetter.and.returnValue('someValue');
      expect(ngNode.css('someProp').value).toBe('someValue');
    });

    it('caches reads to the native style', ()=>{
      somePropGetter.and.returnValue('someValue');
      expect(ngNode.css('someProp').value).toBe('someValue');
      expect(ngNode.css('someProp').value).toBe('someValue');
      expect(somePropGetter.calls.count()).toBe(1);
    });

    it('caches writes to the native style', ()=>{
      ngNode.css('someProp').value = 'someValue';
      expect(ngNode.css('someProp').value).toBe('someValue');
      expect(somePropGetter.calls.count()).toBe(0);
      expect(somePropSetter.calls.count()).toBe(0);
    });

    it('flushes the cached writes to the native style only once', ()=>{
      ngNode.css('someProp').value = 'someValue';
      ngNode.flush();
      ngNode.flush();
      
      expect(somePropSetter.calls.count()).toBe(1)
      expect(somePropSetter).toHaveBeenCalledWith('someValue');
    });

    it('returns the changed styles on flush', ()=>{
      ngNode.css('someProp').value = 'someValue';
      expect(ngNode.flush().styles).toEqual({someProp: 'someValue'});
    });

    it('sets the dirty flag when a style is set and clears it on flush', ()=>{
      expect(ngNode.isDirty()).toBe(false);
      ngNode.css('someProp').value = 'someValue';
      expect(ngNode.isDirty()).toBe(true);
      ngNode.flush();
      expect(ngNode.isDirty()).toBe(false);
    });    
  });

  describe('class access', ()=>{
    var nativeObj, ngNode, classNameGetter, classNameSetter;

    beforeEach(()=>{
      nativeObj = document.createElement('span');
      classNameGetter = jasmine.createSpy('get');
      classNameSetter = jasmine.createSpy('set');
      Object.defineProperty(nativeObj, 'className', {
        get: classNameGetter, set: classNameSetter
      });
      ngNode = new NgNode(nativeObj);
    });

    describe('read', ()=>{
      it('reads a single native class', ()=>{
        classNameGetter.and.returnValue('a b');
        expect(ngNode.clazz('a').value).toBe(true);
        expect(ngNode.clazz('b').value).toBe(true);
        expect(ngNode.clazz('c').value).toBe(false);
      });

      it('uses logical AND when asked for multiple classes, independent of className order', ()=>{
        classNameGetter.and.returnValue('a b');
        expect(ngNode.clazz('a b').value).toBe(true);
        expect(ngNode.clazz('b a').value).toBe(true);
        expect(ngNode.clazz('a c').value).toBe(false);
      });

      it('caches reads to the native className', ()=>{
        classNameGetter.and.returnValue('a b');
        expect(ngNode.clazz('a').value).toBe(true);
        expect(ngNode.clazz('a').value).toBe(true);
        expect(classNameGetter.calls.count()).toBe(1);
      });
    });

    describe('write', ()=>{

      it('reads in the native className', ()=>{
        classNameGetter.and.returnValue('a');
        ngNode.clazz('b').value = true;
        expect(ngNode.clazz('a b').value).toBe(true);        
      });

      it('adds multiple classes', ()=>{
        classNameGetter.and.returnValue('a');
        ngNode.clazz('b c').value = true;
        expect(ngNode.clazz('a b c').value).toBe(true);
      });

      it('removes multiple classes', ()=>{
        classNameGetter.and.returnValue('a b c');
        ngNode.clazz('b c').value = false;
        expect(ngNode.clazz('a').value).toBe(true);
        expect(ngNode.clazz('b').value).toBe(false);
        expect(ngNode.clazz('c').value).toBe(false);
      });

      it('caches reads to the native className', ()=>{
        classNameGetter.and.returnValue('a');
        ngNode.clazz('b').value = true;
        ngNode.clazz('b').value = true;
        expect(classNameGetter.calls.count()).toBe(1);
      });

      it('shares the cache with reads', ()=>{        
        classNameGetter.and.returnValue('a');
        expect(ngNode.clazz('a').value).toBe(true);
        ngNode.clazz('b').value = true;
        expect(ngNode.clazz('a b').value).toBe(true);
        expect(classNameGetter.calls.count()).toBe(1);
      });

      it('flushes the changes to the native className only once', ()=>{
        ngNode.clazz('b c').value = true;
        ngNode.flush();
        ngNode.flush();
        
        expect(classNameSetter.calls.count()).toBe(1);
        var actualClassName = sortClassNames(classNameSetter.calls.argsFor(0)[0]);
        expect(actualClassName).toEqual('b c');
      });

      it('returns the changed classes on flush', ()=>{
        classNameGetter.and.returnValue('a');        
        ngNode.clazz('b').value = true;
        ngNode.clazz('c').value = false;
        expect(ngNode.flush().classes).toEqual({b:true, c:false});
      });

      it('preserves non modified classes during flush', ()=>{
        classNameGetter.and.returnValue('a');        
        ngNode.clazz('b').value = true;
        ngNode.flush();
        
        var actualClassName = sortClassNames(classNameSetter.calls.argsFor(0)[0]);
        expect(actualClassName).toEqual('a b');
      });

      it('sets the dirty flag when a class is changed and clears it on flush', ()=>{
        expect(ngNode.isDirty()).toBe(false);
        ngNode.clazz('a').value = true;
        expect(ngNode.isDirty()).toBe(true);
        ngNode.flush();
        expect(ngNode.isDirty()).toBe(false);
      });    

    });

  });

  describe('general elements', ()=>{
    it('should listen for propchanged events and update the corresponding props inthe cache', ()=>{
      var node = document.createElement('div');
      var ngNode = new NgNode(node);
      node.test1 = 1;
      node.test2 = 2;
      node.test3 = 3;
      expect(ngNode.prop('test1').value).toBe(1);
      expect(ngNode.prop('test2').value).toBe(2);
      expect(ngNode.prop('test3').value).toBe(3);

      node.test1 = 10;
      node.test2 = 20;
      expect(ngNode.prop('test1').value).toBe(1);
      expect(ngNode.prop('test2').value).toBe(2);
      expect(ngNode.prop('test3').value).toBe(3);

      triggerEvent(node, 'propchange', {
        properties: ['test1', 'test2']
      });
      expect(ngNode.prop('test1').value).toBe(10);
      expect(ngNode.prop('test2').value).toBe(20);
      expect(ngNode.prop('test3').value).toBe(3);
    });
  });

  describe('input elements', ()=>{
    it('should listen for input events and update the value in the cache', ()=>{
      var node = document.createElement('input');
      var ngNode = new NgNode(node);

      expect(ngNode.prop('value').value).toBe('');
      node.value = 'someValue';
      expect(ngNode.prop('value').value).toBe('');

      triggerEvent(node, 'input');
      expect(ngNode.prop('value').value).toBe('someValue');
    });

    it('should listen for change events and update the value in the cache', ()=>{
      var node = document.createElement('input');
      var ngNode = new NgNode(node);

      expect(ngNode.prop('value').value).toBe('');
      node.value = 'someValue';
      expect(ngNode.prop('value').value).toBe('');

      triggerEvent(node, 'change');
      expect(ngNode.prop('value').value).toBe('someValue');
    });

    it('should listen for keypress events and update the value in the cache', ()=>{
      var node = document.createElement('input');
      var ngNode = new NgNode(node);

      expect(ngNode.prop('value').value).toBe('');
      node.value = 'someValue';
      expect(ngNode.prop('value').value).toBe('');

      triggerEvent(node, 'keypress');
      expect(ngNode.prop('value').value).toBe('someValue');
    });
  });

  describe('option and select elements', ()=>{
    it('should listen for change events on the select and update "value" prop in the cache', ()=>{
      var select = $('<select><option selected>1</option><option>2</option></select>')[0];
      var ngNode = new NgNode(select);
      expect(ngNode.prop('value').value).toBe('1');
      select.selectedIndex = 1;
      expect(ngNode.prop('value').value).toBe('1');
      triggerEvent(select, 'change');
      expect(ngNode.prop('value').value).toBe('2');
    });
    it('should listen for change events on the select and update "selected" prop of options in the cache', ()=>{
      var select = $('<select><option selected>1</option><option>2</option></select>')[0];
      var option2 = select.childNodes[1];
      var ngNode = new NgNode(option2);
      expect(ngNode.prop('selected').value).toBe(false);
      select.selectedIndex = 1;
      expect(ngNode.prop('selected').value).toBe(false);
      triggerEvent(select, 'change');
      expect(ngNode.prop('selected').value).toBe(true);
    });
  });
});

function triggerEvent(node, evtName, data) {
  var evt = document.createEvent('Event');
  evt.initEvent(evtName, true, true);
  for (var prop in data) {
    evt[prop] = data[prop];
  }
  node.dispatchEvent(evt);  
}

function sortClassNames(classNames:string) {
  return classNames.split(' ').sort().join(' ');
}
