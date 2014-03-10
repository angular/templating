import {use, inject} from 'di/testing';
import {Injector} from 'di/injector';
import {ViewPort, View} from '../src/view';
import {ViewFactory, ElementBinder} from '../src/view_factory';

xdescribe('ViewFactory', () => {
  it('should clone the given nodes', () => {
    var injector = new Injector();
    var nodes = es('a<a></a>');
    var view = new ViewFactory(nodes, []).createView(injector);
    expect(nodes.length).toBe(view.nodes.length);
    for (var i=0; i<nodes.length; i++) {
      expect(nodes[i]).not.toBe(view.nodes[i]);
      expect(html(nodes[i])).toBe(html(view.nodes[i]));
    }
  });

  // TODO: Check the compiler as well:
  // - should not reparent the given nodes!

  // TODO: This should be a document fragment!
  // -> by this, the View operations are faster!
  // (view also needs to save the nodes in an array so it can remove them afterwards!)
  // -> create a test for this in the view

  it('should not reparent the given nodes but group the cloned nodes under a common parent element', ()=>{
    var injector = new Injector();
    var nodes = es('a<a></a>');
    var oldParent = nodes[0].parentNode;
    var view = new ViewFactory(nodes, []).createView(injector);
    var newParent = view.nodes[0].parentNode;

    for (var i=0; i<nodes.length; i++) {
      expect(nodes[i].parentNode).toBe(oldParent);
      expect(view[i])
    }
  });

  it('should call the binders with the elements that have the css class "ng-binder"', ()=>{
    var injector = new Injector();
    var nodes = es('a<a ng-binder>b<b ng-binder></b></a>');
    var binders = mockBinders(3);
    var view = new ViewFactory(nodes, []).createView(injector);
    var nodeParent = view.nodes[0].parentNode;

    expect(binders[0].bind.calls.argsFor(0)[1]).toBe(nodeParent);
    var bindingElements = nodeParent.querySelectorAll('.ng-binder');
    for (var i=0; i<bindingElements.length; i++) {
      expect(binders[i+1].bind.calls.argsFor(0)[1]).toBe(bindingElements[i]);
    }

  });

  it('should hand the injector of a parent element to child elements', ()=>{
    // Case 1: Depth first order
    // Case 2: Jump between child to parent and then to child again
  });

  // TODO: Add an integration test with real selector, compiler and view factory
  // -> move to separate test file?!

});


function es(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  return div.childNodes;
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

function mockBinders(count) {
  var binders = [];
  for (var i=0; i<count; i++) {
    var binder = new ElementBinderImpl();
    spyOn(binder, 'bind');
    binders.push(binder);
  }
  return binders;
}
