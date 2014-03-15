import {assert} from 'assert';
import {Injector} from 'di/injector';

export class ArrayLikeOfNodes {
  static assert(obj) {
    assert(obj.length).is(assert.number);
    for (var i=0, ii=obj.length; i<ii; i++) {
      assert(obj[i]).is(Node);
    }
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}

export class ArrayOfObject {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(assert.object));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}

export class ArrayOfString {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(assert.string));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}

export class NodeAttrs {
  constructor(data = {}) {
    this.init = data.init || {};
    this.bind = data.bind || {};
    this.event = data.event || {};
  }
}

export class ArrayOfClass {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(Function));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}
