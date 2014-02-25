import {assert} from 'assert';

export class ArrayLike {
  static assert(obj) {
    assert(obj.length).is(assert.number);
    for (var i=0, ii=obj.length; i<ii; i++) {
      assert(obj[i]).is(Node);
    }
  }
}


