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

export var AbstractNodeBinder = assert.define('AbstractNodeBinder', function(obj) {
  assert(obj).is(assert.structure({
    attrs: Object
  }));
});

export var CompiledTemplate = assert.define('CompiledTemplate', function(obj) {
  assert(obj).is(assert.structure({
    container: NodeContainer,
    binders:assert.arrayOf(ElementBinder)
  }));
  assert(obj.binders).is(TreeArray);
});

export var ElementBinder = assert.define('ElementBinder', function(obj) {
  AbstractNodeBinder.assert(obj);
  assert(obj).is(assert.structure({
    // TODO: attrs: assert.structure({bind: object, init: object, events: object})
    decorators: ArrayOfClass,
    component: Function,
    template: assert.structure({
      compiledTemplate: CompiledTemplate,
      directive: Function
    }),
    textBinders: assert.arrayOf(TextBinder)
  }));
});

export var TextBinder = assert.define('TextBinder', function(obj) {
  assert(obj).is(assert.structure({
    indexInParent: assert.number,
    expression: assert.string
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
