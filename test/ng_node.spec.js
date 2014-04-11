import {NgNode, getNgApi} from '../src/ng_node';
import {$} from './dom_mocks';

describe('getNgApi', ()=>{
  var oldNgApi;
  beforeEach(()=>{
    oldNgApi = HTMLInputElement.prototype.ngApi;
    delete HTMLInputElement.prototype.ngApi;
  });

  afterEach(()=>{
    HTMLInputElement.prototype.ngApi = oldNgApi;
  });

  it('should not return native properties', ()=>{
    var node = document.createElement('input');
    expect(getNgApi(node)).toEqual({});
  });

  it('should return custom properties as not observable', ()=>{
    var node = document.createElement('input');
    node.someProp = 'someValue';
    expect(getNgApi(node)).toEqual({someProp: {}});
  });

  it('should merge in properties defined in ngApi properties on the prototypes', ()=>{
    var node = document.createElement('input');
    var customProto = Object.create(node.__proto__);
    node.__proto__ = customProto;
    customProto.ngApi = {
      customInput: {}
    };
    HTMLInputElement.prototype.ngApi = {
      input: {event: 'change'}
    }
    node.nonNgApiProp = true;
    expect(getNgApi(node)).toEqual({
      nonNgApiProp: {},
      customInput : {},
      input : {event: 'change'}
    });
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


    describe('event listening', ()=>{
      var listener;
      beforeEach(()=>{
        listener = jasmine.createSpy('listener');
      });

      it('should listen for propchanged events and update the given properties', ()=>{
        var listener = jasmine.createSpy('listener');
        var node = document.createElement('div');
        node.test1 = 1;
        node.test2 = 2;
        var ngNode = new NgNode(node);
        expect(ngNode.test1).toBe(1);
        expect(ngNode.test2).toBe(2);
        ngNode.observeProp('test1', listener);

        node.test1 = 10;
        expect(ngNode.test1).toBe(1);
        expect(ngNode.test2).toBe(2);
        expect(listener).not.toHaveBeenCalled();

        triggerEvent(node, 'propchange', {
          properties: ['test1']
        });
        expect(listener).toHaveBeenCalledWith(10, 1);
        expect(ngNode.test1).toBe(10);
        expect(ngNode.test2).toBe(2);
      });

      describe('input elements', ()=>{
        var node, ngNode;
        beforeEach(()=>{
          node = document.createElement('input');
          ngNode = new NgNode(node);
          ngNode.observeProp('value', listener);
        });

        it('should listen for input events and update the value property', ()=>{
          expect(ngNode.value).toBe('');
          node.value = 'someValue';
          expect(ngNode.value).toBe('');
          expect(listener).not.toHaveBeenCalled();

          triggerEvent(node, 'input');
          expect(listener).toHaveBeenCalledWith('someValue', '');
          expect(ngNode.value).toBe('someValue');
        });

        it('should listen for change events and update the value in the cache', ()=>{
          expect(ngNode.value).toBe('');
          node.value = 'someValue';
          expect(ngNode.value).toBe('');

          triggerEvent(node, 'change');
          expect(listener).toHaveBeenCalledWith('someValue', '');
          expect(ngNode.value).toBe('someValue');
        });

        it('should listen for keypress events and update the value in the cache', ()=>{
          expect(ngNode.value).toBe('');
          node.value = 'someValue';
          expect(ngNode.value).toBe('');

          triggerEvent(node, 'keypress');
          expect(listener).toHaveBeenCalledWith('someValue', '');
          expect(ngNode.value).toBe('someValue');
        });
      });

      it('should listen for change events on the select and update "value" prop in the cache', ()=>{
        var select = $('<select><option selected>1</option><option>2</option></select>')[0];
        var ngNode = new NgNode(select);
        ngNode.observeProp('value', listener);

        expect(ngNode.value).toBe('1');
        select.selectedIndex = 1;
        expect(ngNode.value).toBe('1');
        triggerEvent(select, 'change');
        expect(listener).toHaveBeenCalledWith('2', '1');
        expect(ngNode.value).toBe('2');
      });
    });

    describe('other nodes', ()=>{
      it('should provide the textContent property for text nodes', ()=>{
        var text = document.createTextNode('someText');
        var ngNode = new NgNode(text);
        expect(ngNode.textContent).toBe('someText')
      });

      it('should work for comment nodes', ()=>{
        var comment = document.createComment('someComment');
        var ngNode = new NgNode(comment);
        expect(ngNode.nodeValue).not.toBeDefined();
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
