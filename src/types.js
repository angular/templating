import {assert} from 'rtts-assert';

export var CompiledTemplatePromise = assert.define('CompiledTemplatePromise', function(obj) {
  // TODO: How to assert that the result of the promise
  // is a CompiledTemplate?
  assert(obj).is(assert.structure({
    then: Function
  }));
});

export var ChildInjectorConfig = assert.define('ChildInjectorConfig', function(obj) {
  assert(obj).is(assert.structure({
    modules: [],
    forceNewInstancesOf: []
  }));
});

export var NodeContainer = assert.define('NodeContainer', function(obj) {
  assert(obj).is(assert.structure({
    cloneNode: Function,
    // getElementsByClassName would be nicer,
    // however, documentFragments only support
    // querySelectorAll and not getElementsByClassName
    querySelectorAll: Function,
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

export var TreeArrayOfElementBinder = assert.define('TreeArrayOfElementBinder', function(obj) {
  assert(obj).is(assert.arrayOf(ElementBinder));
  assert(obj).is(TreeArray);
});

export var AbstractNodeBinder = assert.define('AbstractNodeBinder', function(obj) {
  assert(obj).is(assert.structure({
    attrs: Object
  }));
});

export var CompiledTemplate = assert.define('CompiledTemplate', function(obj) {
  assert(obj).is(assert.structure({
    container: NodeContainer,
    binders: TreeArrayOfElementBinder
  }));
});

export var ElementBinder = assert.define('ElementBinder', function(obj) {
  AbstractNodeBinder.assert(obj);
  assert(obj).is(assert.structure({
    decorators: ArrayOfClass,
    component: Function,
    nonElementBinders: assert.arrayOf(NonElementBinder),
    level: assert.number
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

export var TreeArrayNode = assert.define('TreeArrayNode', function(obj) {
  assert(obj).is(assert.structure({
    level: assert.number
  }));
});

/**
 * An array of TreeArrayNodes that represent a valid depth-first-tree.
 */
export var TreeArray = assert.define('TreeArray', function(obj) {
  assert(obj).is(assert.arrayOf(TreeArrayNode));
  var prevLevel = -1;
  obj.forEach((node) => {
    var newLevel = node.level;
    if (newLevel === null) {
      assert.fail('level must be set');
    }
    if (newLevel<0) {
      assert.fail('level must be >=0');
    }
    if (newLevel>=prevLevel && newLevel-prevLevel > 1) {
      assert.fail("levels can't be skipped");
    }
    prevLevel = newLevel;
  });
});