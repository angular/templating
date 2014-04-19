import {NgNode, getNodeComponentApi} from '../src/ng_node';
import {$} from './dom_mocks';

describe('getNodeComponentApi', ()=>{
  it('should not return properties of HTMLElement', ()=>{
    expect(getNodeComponentApi('input').firstNode).toBeFalsy();
  });

  it('should return properties that are not in HTMLElement', ()=>{
    expect(getNodeComponentApi('input').value).toBe(true);
  });

  it('should return nothing for spans', ()=>{
    expect(getNodeComponentApi('span')).toEqual({});
  });

  it('should return textContent for text nodes', ()=>{
    expect(getNodeComponentApi(document.createTextNode('test').nodeName).textContent).toBe(true);
  });

  it('should return nothing for comments', ()=>{
    expect(getNodeComponentApi(document.createComment('test').nodeName)).toEqual({});
  });
});

describe('ng_node', ()=>{

  it('should store extra data', ()=>{
    var data = {};
    var node = new NgNode(document.createElement('span'),data);
    expect(node.data).toBe(data);
  });

  it('should return the native node', ()=>{
    var node = document.createElement('span');
    var ngNode = new NgNode(node);
    expect(ngNode.nativeNode).toBe(node);
  });

  it('should save itself on the node', ()=>{
    var node = document.createElement('span');
    var ngNode = new NgNode(node);
    expect(node.ngNode).toBe(ngNode);
  });

  describe('property access', ()=>{
    var nativeObj, ngNode, somePropGetter, somePropSetter, nodeData;

    beforeEach(()=>{
      nodeData = {};
      nativeObj = document.createElement('span');
      somePropGetter = jasmine.createSpy('get');
      somePropSetter = jasmine.createSpy('set');
      Object.defineProperty(nativeObj, 'someProp', {
        get: somePropGetter, set: somePropSetter
      });
      ngNode = new NgNode(nativeObj);
      ngNode.addProperties(['someProp']);
    });

    it('reads the native property', ()=>{
      somePropGetter.and.returnValue('someValue');
      expect(ngNode.someProp).toBe('someValue');
    });

    it('caches writes to the native property', ()=>{
      ngNode.someProp = 'someValue';
      expect(ngNode.someProp).toBe('someValue');
      expect(somePropSetter.calls.count()).toBe(0);
    });

    it('calls the flushQueue with a listener to flush the node', ()=>{
      var flushQueue = [];
      ngNode.setFlushQueue(flushQueue.push.bind(flushQueue));
      ngNode.someProp = 'someValue';

      expect(flushQueue.length).toBe(1);
      expect(somePropSetter).not.toHaveBeenCalled();

      flushQueue.forEach((fn)=>{fn();});
      expect(somePropSetter.calls.count()).toBe(1)
      expect(somePropSetter).toHaveBeenCalledWith('someValue');
    });

    describe('addProperties', ()=>{

      it('should add the given properties and initialize them with the values on the node', ()=>{
        nativeObj.someNewProp = 'someNewValue';
        expect(ngNode.someNewProp).toBeUndefined();
        ngNode.addProperties(['someNewProp']);
        expect(ngNode.someNewProp).toBeDefined();
      });

    });

    it('can write falsy values', ()=>{
      [false, null, undefined, ''].forEach((falsy)=>{
        ngNode.a = falsy;
        expect(ngNode.a).toBe(falsy);
      })
    });

    describe('observeProp', ()=>{
      it('notifies write listeners', ()=>{
        nativeObj.propA = 'a';
        nativeObj.propB = 'b';
        ngNode.addProperties(['propA', 'propB']);

        var spy = jasmine.createSpy('listener');
        ngNode.observeProp('propA', spy);
        expect(spy).not.toHaveBeenCalled();

        ngNode.propA = 'someValue';
        expect(spy).toHaveBeenCalledWith('someValue', 'a');

        spy.calls.reset();
        ngNode.propB = 'anotherValue';
        expect(spy).not.toHaveBeenCalled();
      });

    });

    describe('refreshProperties', ()=>{
      it('should load the current value from the node', ()=>{
        somePropGetter.and.returnValue('someValue');
        expect(ngNode.someProp).toBe('someValue')
        somePropGetter.and.returnValue('anotherValue');
        expect(ngNode.someProp).toBe('someValue')
        ngNode.refreshProperties(['someProp']);
        expect(ngNode.someProp).toBe('anotherValue')
      });

      it('should reset the dirty state of the property', ()=>{
        var flushQueue = [];
        ngNode.setFlushQueue(flushQueue.push.bind(flushQueue));
        ngNode.someProp = 'a';

        somePropGetter.and.returnValue('b');
        ngNode.refreshProperties(['someProp']);
        expect(flushQueue.length).toBe(1);
        flushQueue[0]();
        expect(somePropSetter).not.toHaveBeenCalled();
      });

      it('should call observers if the value changed', ()=>{
        var observer = jasmine.createSpy('observer');
        ngNode.observeProp('someProp', observer);

        somePropGetter.and.returnValue('someValue');
        // read the property to initialize the ngNode cache
        var x = ngNode.someProp;
        somePropGetter.and.returnValue('anotherValue');
        ngNode.refreshProperties(['someProp']);

        expect(observer).toHaveBeenCalledWith('anotherValue', 'someValue');
      });
    });

  });

  describe('style access', ()=>{
    var nativeObj, ngNode;

    beforeEach(()=>{
      nativeObj = document.createElement('span');
      ngNode = new NgNode(nativeObj);
      nativeObj.style.display = 'inline';
    });

    it('reads the native style', ()=>{
      nativeObj.style.display = 'block';
      expect(ngNode.style.display).toBe('block');
    });

    it('caches reads to the native style', ()=>{
      nativeObj.style.display = 'block';
      expect(ngNode.style.display).toBe('block');
      nativeObj.style.display = 'inline';
      expect(ngNode.style.display).toBe('block');
    });

    it('caches writes to the native style', ()=>{
      ngNode.style.display = 'block';
      expect(nativeObj.style.display).toBe('inline');
    });

    it('calls the flushQueue with a listener to flush the node', ()=>{
      var flushQueue = [];
      ngNode.setFlushQueue(flushQueue.push.bind(flushQueue));

      ngNode.style.display = 'block';
      expect(flushQueue.length).toBe(1);
      flushQueue[0]();
      expect(nativeObj.style.display).toBe('block');
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
    });

    describe('contains', ()=>{
      it('reads a native class on create', ()=>{
        classNameGetter.and.returnValue('a b');
        ngNode = new NgNode(nativeObj);
        expect(ngNode.classList.contains('a')).toBe(true);
        expect(ngNode.classList.contains('b')).toBe(true);
        expect(ngNode.classList.contains('c')).toBe(false);
      });

      it('caches reads to the native className', ()=>{
        classNameGetter.and.returnValue('a b');
        ngNode = new NgNode(nativeObj);
        expect(ngNode.classList.contains('a')).toBe(true);
        expect(ngNode.classList.contains('a')).toBe(true);
        expect(classNameGetter.calls.count()).toBe(1);
      });
    });

    it('adds multiple classes', ()=>{
      classNameGetter.and.returnValue('a');
      ngNode = new NgNode(nativeObj);
      ngNode.classList.add('b','c');
      expect(ngNode.classList.contains('a')).toBe(true);
      expect(ngNode.classList.contains('b')).toBe(true);
      expect(ngNode.classList.contains('c')).toBe(true);
    });

    it('removes multiple classes', ()=>{
      classNameGetter.and.returnValue('a b c');
      ngNode = new NgNode(nativeObj);
      ngNode.classList.remove('b','c');
      expect(ngNode.classList.contains('a')).toBe(true);
      expect(ngNode.classList.contains('b')).toBe(false);
      expect(ngNode.classList.contains('c')).toBe(false);
    });

    it('toggles classes', ()=>{
      classNameGetter.and.returnValue('a b');
      ngNode = new NgNode(nativeObj);
      ngNode.classList.toggle('b');
      expect(ngNode.classList.contains('a')).toBe(true);
      expect(ngNode.classList.contains('b')).toBe(false);
      expect(ngNode.classList.contains('c')).toBe(false);

      ngNode.classList.toggle('c');
      expect(ngNode.classList.contains('a')).toBe(true);
      expect(ngNode.classList.contains('b')).toBe(false);
      expect(ngNode.classList.contains('c')).toBe(true);
    });

    it('force toggles classes', ()=>{
      classNameGetter.and.returnValue('a b');
      ngNode = new NgNode(nativeObj);
      ngNode.classList.toggle('a', false);
      ngNode.classList.toggle('b', false);
      ngNode.classList.toggle('c', true);
      expect(ngNode.classList.contains('a')).toBe(false);
      expect(ngNode.classList.contains('b')).toBe(false);
      expect(ngNode.classList.contains('c')).toBe(true);
    });

    it('caches writes', ()=>{
      ngNode = new NgNode(nativeObj);
      ngNode.classList.add('a');
      expect(classNameSetter).not.toHaveBeenCalled();
    });

    it('calls the flushQueue with a listener to flush the node', ()=>{
      classNameGetter.and.returnValue('a');
      ngNode = new NgNode(nativeObj);
      var flushQueue = [];
      ngNode.setFlushQueue(flushQueue.push.bind(flushQueue));

      ngNode.classList.add('b');

      expect(flushQueue.length).toBe(1);
      flushQueue[0]();

      expect(classNameSetter.calls.count()).toBe(1);
      var actualClassName = sortClassNames(classNameSetter.calls.argsFor(0)[0]);
      expect(actualClassName).toEqual('a b');
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
