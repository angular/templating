import {assert} from 'rtts-assert';
import {Injector} from 'di';

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
  static toCamelCase(attrName) {
    return attrName.split('-').map((part, index) => {
      if (index>0) {
        return part.charAt(0).toUpperCase()+part.substring(1);
      } else {
        return part;
      }
    }).join('');
  }
  constructor(data = {}) {
    this.init = data.init || {};
    this.bind = data.bind || {};
    this.event = data.event || {};
  }
  split(props:ArrayOfString) {
    var res = new NodeAttrs();
    props.forEach((propName) => {
      if (propName in this.init) {
        res.init[propName] = this.init[propName];
        delete this.init[propName];
      }
      if (propName in this.bind) {
        res.bind[propName] = this.bind[propName];
        delete this.bind[propName];          
      }
    });
    return res;
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

