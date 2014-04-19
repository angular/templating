import {inject} form 'di/testing';
import {Injector} from 'di';
import {EventHandler} from '../src/event_handler';
import {NgNode} from '../src/ng_node';
import {$} from './dom_mocks';

describe('EventHandler', ()=>{
  var cleanupQueue, injector, eventHandler, injector;

  beforeEach(()=>{
    cleanupQueue = [];
    inject(EventHandler, Injector, (_eventHandler, _injector)=>{
      eventHandler = _eventHandler;
      injector = _injector;
    });
  });

  afterEach(()=>{
    cleanupQueue.forEach((callback)=>{
      callback();
    });
  });

  it('should call onEvent handlers', ()=> {
    var container = createContainer('<div></div>');
    var events = [{event: 'click', handler: 'onEvent', expression: 'someExpression'}];
    eventHandler.install([container], events);
    var view = {
      evaluate: jasmine.createSpy('evaluate')
    };
    var ngNode = new NgNode(container, {
      view: view,
      events: events
    });
    triggerEvent(container, 'click');
    expect(view.evaluate).toHaveBeenCalledWith('someExpression');
	});

  it('should call no handler if there is no ngNode with events', ()=> {
    var container = createContainer('<div></div>');
    var events = [{event: 'click', handler: 'onEvent', expression: 'someExpression'}];
    eventHandler.install([container], events);
    var view = {
      evaluate: jasmine.createSpy('evaluate')
    };
    var ngNode = new NgNode(container);
    triggerEvent(container, 'click');
    expect(view.evaluate).not.toHaveBeenCalled();
  });

  it('should call onEvent handlers if the event was triggered on a child node', ()=> {
    var container = createContainer('<div><a></a></div>');
    var events = [{event: 'click', handler: 'onEvent', expression: 'someExpression'}];
    eventHandler.install([container], events);
    var view = {
      evaluate: jasmine.createSpy('evaluate')
    };
    var ngNode = new NgNode(container, {
      view: view,
      events: events
    });
    triggerEvent(container.childNodes[0], 'click');
    expect(view.evaluate).toHaveBeenCalledWith('someExpression');
  });

  it('should call directives event handlers', ()=>{
    class SomeDirective {}

    var container = createContainer('<div></div>');
    var events = [{event: 'click', handler: 'directive', expression: 'someExpression', directive: SomeDirective}];
    eventHandler.install([container], events);
    var view = {
      evaluate: jasmine.createSpy('evaluate')
    };
    var ngNode = new NgNode(container, {
      view: view,
      events: events,
      injector: injector
    });
    triggerEvent(container, 'click');
    expect(view.evaluate).toHaveBeenCalledWith('someExpression', injector.get(SomeDirective));
  });

  it('should listen for propchange event and refresh the properties of the ngNode',  ()=>{
    var container = createContainer('<div></div>');
    eventHandler.install([container], []);
    var ngNode = new NgNode(container);
    spyOn(ngNode, 'refreshProperties');
    triggerEvent(container, 'propchange', {
      properties: ['aProp']
    });
    expect(ngNode.refreshProperties).toHaveBeenCalledWith(['aProp']);
  });

  it('should refresh ngNode properties depending on the configuration',  ()=>{
    var container = createContainer('<div></div>');
    var events = [{event: 'someEvent', handler: 'refreshNode', properties: ['aProp']}];
    eventHandler.install([container], events);
    var ngNode = new NgNode(container, {
      events: events
    });
    spyOn(ngNode, 'refreshProperties');
    triggerEvent(container, 'someEvent');
    expect(ngNode.refreshProperties).toHaveBeenCalledWith(['aProp']);
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
  }
});
