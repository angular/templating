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

/**
 * interface for the class ElementBinderImpl
 * to break cyclic type dependencies.
 */
export class ElementBinder {
  constructor() {
    throw new Error('type is not instantiable');
  }
}

export class NonElementBinder {
  constructor() {
    throw new Error('type is not instantiable');
  }
}

export class ArrayOfElementBinder {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(ElementBinder));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }  
}
