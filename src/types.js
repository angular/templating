import {assert} from 'assert';

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

export class ArrayOfString {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(assert.string));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}

export class ArrayOfNameValueString {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(assert.structure({
          name: assert.string, 
          value: assert.string
        })));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}
