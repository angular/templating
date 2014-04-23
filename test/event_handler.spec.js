import {inject, use} form 'di/testing';
import {Injector} from 'di';
import {EventHandler, ChangeEventConfig} from '../src/event_handler';
import {NgNode} from '../src/ng_node';
import {$} from './dom_mocks';

describe('EventHandler', ()=>{
  var cleanupQueue, eventHandler;

  beforeEach(()=>{
    cleanupQueue = [];
  });

  afterEach(()=>{
    cleanupQueue.forEach((callback)=>{
      callback();
    });
  });

  describe('ngNode handlers', ()=>{

    beforeEach(()=>{
      inject(EventHandler, (_eventHandler)=>{
        eventHandler = _eventHandler;
      });
    });

    it('should call ngNode event handlers', ()=> {
      var container = createContainer('<div></div>');
      eventHandler.install([container], ['someEvent']);
      var handler = jasmine.createSpy('handler');
      var ngNode = new NgNode(container, {
        events: {
          'someEvent': [handler]
        }
      });
      var evt = triggerEvent(container, 'someEvent');
      expect(handler).toHaveBeenCalledWith(evt, ngNode);
    });

    it('should call ngNode event handlers if the event was triggered on a child node', ()=> {
      var container = createContainer('<div><a></a></div>');
      eventHandler.install([container], ['someEvent']);
      var handler = jasmine.createSpy('handler');
      var childNode = container.childNodes[0];
      var ngNode = new NgNode(childNode, {
        events: {
          'someEvent': [handler]
        }
      });
      var evt = triggerEvent(childNode, 'someEvent');
      expect(handler).toHaveBeenCalledWith(evt, ngNode);
    });

  });

  describe('change events', ()=>{
    var container, ngNode;

    function init(config, containerHtml) {
      use(config).as(ChangeEventConfig);
      inject(EventHandler, (_eventHandler)=>{
        eventHandler = _eventHandler;
      });
      container = createContainer('<div></div>');
      eventHandler.install([container], []);
      ngNode = new NgNode(container);
      spyOn(ngNode, 'refreshProperties');
    }

    it('should refresh ngNode properties',  ()=>{
      init([{
        nodeName: 'div', events: ['someEvent'], properties: ()=>['someProp']
      }], '<div></div>');

      triggerEvent(container, 'someEvent');
      expect(ngNode.refreshProperties).toHaveBeenCalledWith(['someProp']);
    });

    it('should check the nodeName',  ()=>{
      init([{
        nodeName: 'someOtherNode', events: ['someEvent'], properties: ()=>['someProp']
      }], '<div></div>');

      triggerEvent(container, 'someEvent');
      expect(ngNode.refreshProperties).not.toHaveBeenCalled();
    });

    it('should check the event name',  ()=>{
      init([{
        nodeName: 'div', events: ['someOtherEvent'], properties: ()=>['someProp']
      }], '<div></div>');

      triggerEvent(container, 'someEvent');
      expect(ngNode.refreshProperties).not.toHaveBeenCalled();
    });

    it('should hand in the event into the properties callback',  ()=>{
      var callback = jasmine.createSpy('properties');
      init([{
        nodeName: 'div', events: ['someEvent'], properties: callback
      }], '<div></div>');

      var evt = triggerEvent(container, 'someEvent');
      expect(callback).toHaveBeenCalledWith(evt);
    });

  });


  function createContainer(html) {
    // need to add the node to the document, otherwise
    // the bubbling does not work!
    var res = $(html)[0];
    document.body.appendChild(res);
    cleanupQueue.push(()=>{
      res.remove();
    });
    return res;
  }

  function triggerEvent(node, evtName, data) {
    var evt = document.createEvent('Event');
    evt.initEvent(evtName, true, true);
    for (var prop in data) {
      evt[prop] = data[prop];
    }
    node.dispatchEvent(evt);
    return evt;
  }
});
