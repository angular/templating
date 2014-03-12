import {use, inject} from 'di/testing';
import {Injector} from 'di/injector';
import {ViewPort, View} from '../src/view';
import {ViewFactory, ElementBinder, NonElementBinder} from '../src/view_factory';
import {EXECUTION_CONTEXT} from '../src/annotations';

describe('ViewFactory', () => {
  it('should clone the given nodes', () => {
    var injector = new Injector();
    var nodes = es('a<a></a>');
    var view = new ViewFactory(nodes, []).createView(injector, {});
    expect(nodes.length).toBe(view.nodes.length);
    for (var i=0; i<nodes.length; i++) {
      expect(nodes[i]).not.toBe(view.nodes[i]);
      expect(html(nodes[i])).toBe(html(view.nodes[i]));
    }
  });

  it('should not reparent the given nodes', ()=>{
    var injector = new Injector();
    var node = e('a');
    var oldParent = node.parentNode;
    new ViewFactory([node], []).createView(injector, {});
    expect(node.parentNode).toBe(oldParent);
  });

  it('should create a child injector and provide the given executionContext on the new injector', ()=>{
    var injector = new Injector();
    var execContext = {};
    var view = new ViewFactory(es('a'), []).createView(injector, execContext);
    expect(view.injector.parent).toBe(injector);
    expect(view.injector.get(EXECUTION_CONTEXT)).toBe(execContext);
  });

  it('should not call the first binder', ()=>{
    var injector = new Injector();
    var binders = mockBinders([0]);
    var view = new ViewFactory([], binders)
      .createView(injector, {});
    
    expect(binders[0].bind).not.toHaveBeenCalled();
  });

  it('should call the second and further binders with the elements that have the css class "ng-binder"', ()=>{
    var injector = new Injector();
    var binders = mockBinders([0,1]);
    var view = new ViewFactory(es('<a></a><b class="ng-binder"></b>'), binders)
      .createView(injector, {});
    
    expect(binders[1].bind.calls.argsFor(0)[1]).toBe(view.nodes[1]);
  });

  it('should pass the injector that is returned by a binder to its children', () => {
    var injector = new Injector();
    var binders = mockBinders([0,1,2,1]);
    var view = new ViewFactory(es('<a class="ng-binder"><b class="ng-binder"></b></a><a class="ng-binder">'), binders)
      .createView(injector, {});
        
    expect(binders[1].bind.calls.argsFor(0)[0]).toBe(view.injector);
    expect(binders[2].bind.calls.argsFor(0)[0].parent).toBe(view.injector);
    expect(binders[3].bind.calls.argsFor(0)[0]).toBe(view.injector);
  });


  it('should call NonElementBinders ', () => {
    var injector = new Injector();
    var binders = mockBinders([0,1]);
    var rootNonElBinders = binders[0].nonElementBinders = mockNonElementBinders([0,2]);
    var nonRootNonElBinders = binders[1].nonElementBinders = mockNonElementBinders([0]);
    var view = new ViewFactory(es('a<a class="ng-binder">c</a>b'), binders)
      .createView(injector, {});
    expect(rootNonElBinders[0].bind).toHaveBeenCalledWith(view.injector, view.nodes[0]);
    expect(rootNonElBinders[1].bind).toHaveBeenCalledWith(view.injector, view.nodes[2]);

    expect(nonRootNonElBinders[0].bind).toHaveBeenCalledWith(binders[1].childInjector, view.nodes[1].childNodes[0]);
  });

  it('should store the created injectors on the nodes', () => {
    var injector = new Injector();
    var binders = mockBinders([0,1]);
    var rootNonElBinders = binders[0].nonElementBinders = mockNonElementBinders([0]);
    var nonRootNonElBinders = binders[1].nonElementBinders = mockNonElementBinders([0]);
    var view = new ViewFactory(es('a<a class="ng-binder">c</a>'), binders)
      .createView(injector, {});

    expect(view.nodes[0].injector).toBe(rootNonElBinders[0].childInjector);
    expect(view.nodes[1].injector).toBe(binders[1].childInjector);
    expect(view.nodes[1].childNodes[0].injector).toBe(nonRootNonElBinders[0].childInjector);
  });

});


function es(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  return div.childNodes;
}

function e(html) {
  return es(html)[0];
}

function html(es) {
  var esArr = Array.prototype.slice.call(es);
  return esArr.map((e) => {
    if (e.nodeType === Node.ELEMENT_NODE) {
      return e.outerHTML;
    } else {
      return e.nodeValue;
    }
  }).join('');
}

function mockBinder(level) {
  var binder = new ElementBinder();
  binder.setLevel(level);
  spyOn(binder, 'bind').and.callFake(function(injector) {
    return binder.childInjector = injector.createChild();
  });
  return binder;  
}

function mockBinders(levels) {
  var binders = [];
  for (var i=0; i<levels.length; i++) {
    binders.push(mockBinder(levels[i]));
  }
  return binders;
}

function mockNonElementBinder(indexInParent) {
  var binder = new NonElementBinder();
  binder.setIndexInParent(indexInParent);
  spyOn(binder, 'bind').and.callFake(function(injector) {
    return binder.childInjector = injector.createChild();
  });
  return binder;  
}

function mockNonElementBinders(indicesInParent) {
  var binders = [];
  for (var i=0; i<indicesInParent.length; i++) {
    binders.push(mockNonElementBinder(indicesInParent[i]));
  }
  return binders;
}
