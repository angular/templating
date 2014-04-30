import {assert} from 'rtts-assert';

export var NodeContainer = assert.define('NodeContainer', function(obj) {
  assert(obj).is(assert.structure({
    childNodes: ArrayLikeOfNodes,
    nodeType: assert.number
  }));
});

export var ArrayLikeOfNodes = assert.define('ArrayLikeOfNodes', function(obj) {
  assert(obj.length).is(assert.number);
  for (var i=0, ii=obj.length; i<ii; i++) {
    assert(obj[i]).is(Node);
  }
});

export var ArrayOfObject = assert.define('ArrayOfObject', function(obj) {
  assert(obj).is(assert.arrayOf(assert.object));
});

export var ArrayOfString = assert.define('ArrayOfString', function(obj) {
  assert(obj).is(assert.arrayOf(assert.string));
});

export var ArrayOfClass = assert.define('ArrayOfClass', function(obj) {
  assert(obj).is(assert.arrayOf(Function));
});

export var ArrayOfElementBinder = assert.define('ArrayOfElementBinder', function(obj) {
  assert(obj).is(assert.arrayOf(ElementBinder));
});

export var AbstractNodeBinder = assert.define('AbstractNodeBinder', function(obj) {
  assert(obj).is(assert.structure({
    attrs: Object
  }));
});

export var CompiledTemplate = assert.define('CompiledTemplate', function(obj) {
  assert(obj).is(assert.structure({
    container: NodeContainer,
    binders: ArrayOfElementBinder
  }));
});

export var ElementBinder = assert.define('ElementBinder', function(obj) {
  AbstractNodeBinder.assert(obj);
  assert(obj).is(assert.structure({
    decorators: ArrayOfClass,
    component: Function,
    nonElementBinders: assert.arrayOf(NonElementBinder)
  }));
});

export var NonElementBinder = assert.define('NonElementBinder', function(obj) {
  AbstractNodeBinder.assert(obj);
  assert(obj).is(assert.structure({
    template: assert.structure({
      compiledTemplate: CompiledTemplate,
      directive: Function
    }),
    indexInParent: assert.number
  }));
});
