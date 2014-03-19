import {use, inject} from 'di/testing';
import {Injector} from 'di/injector';
import {ViewPort, View} from '../src/view';
import {ViewFactory, ElementBinder, NonElementBinder} from '../src/view_factory';
import {$, $html} from './dom_mocks';

describe('ViewFactory', () => {
  it('should not clone the given nodes if inplace flag is set', () => {
    var injector = new Injector();
    var container = $('<div>a<a></a></div>')[0];
    var view = new ViewFactory(container, []).createView(injector, {}, true);
    expect(Array.prototype.slice.call(container.childNodes)).toEqual(view.nodes);
  });

  it('should clone the given nodes if inplace flag is not set', () => {
    var injector = new Injector();
    var container = $('<div>a<a></a></div>')[0];
    var view = new ViewFactory(container, []).createView(injector, {});
    expect(Array.prototype.slice.call(container.childNodes)).not.toEqual(view.nodes);
    expect($html(container.childNodes)).toBe($html(view.nodes));
  });

  it('should not reparent the given nodes', ()=>{
    var injector = new Injector();
    var container = $('<div>a</div>')[0]
    var node = container.childNodes[0];
    new ViewFactory(container, []).createView(injector, {});
    expect(node.parentNode).toBe(container);
  });

  it('should create a child injector and provide the view on the new injector', ()=>{
    var injector = new Injector();
    var execContext = {};
    var view = new ViewFactory($('<div>a</div>')[0], []).createView(injector, execContext);
    expect(view.injector.parent).toBe(injector);
    expect(view.injector.get(View)).toBe(view);
  });

  it('should save the executionContext on the view', ()=>{
    var injector = new Injector();
    var execContext = {};
    var view = new ViewFactory($('<div>a</div>')[0], []).createView(injector, execContext);
    expect(view.executionContext).toBe(execContext);
  });

  it('should not call the first binder', ()=>{
    var injector = new Injector();
    var binders = mockBinders([0]);
    var view = new ViewFactory($('<div></div>')[0], binders)
      .createView(injector, {});
    
    expect(binders[0].bind).not.toHaveBeenCalled();
  });

  it('should call the second and further binders with the elements that have the css class "ng-binder"', ()=>{
    var injector = new Injector();
    var binders = mockBinders([0,1]);
    var view = new ViewFactory($('<div><a></a><b class="ng-binder"></b></div>')[0], binders)
      .createView(injector, {});
    
    expect(binders[1].bind.calls.argsFor(0)[1]).toBe(view.nodes[1]);
  });

  it('should pass the injector that is returned by a binder to its children', () => {
    var injector = new Injector();
    var binders = mockBinders([0,1,2,1]);
    var view = new ViewFactory($('<div><a class="ng-binder"><b class="ng-binder"></b></a><a class="ng-binder"></div>')[0], binders)
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
    var view = new ViewFactory($('<div>a<a class="ng-binder">c</a>b</div>')[0], binders)
      .createView(injector, {});
    expect(rootNonElBinders[0].bind).toHaveBeenCalledWith(view.injector, view.nodes[0]);
    expect(rootNonElBinders[1].bind).toHaveBeenCalledWith(view.injector, view.nodes[2]);

    expect(nonRootNonElBinders[0].bind).toHaveBeenCalledWith(binders[1].childInjector, view.nodes[1].childNodes[0]);
  });

});


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
