import {Directive} from '../annotations';
import {assert} from 'rtts-assert';

/**
 * DirectiveClass represents all of the meta data for un-instantiated directive
 */
export class DirectiveClass {
  constructor(
    // The directive annotation
    annotation:Directive, 
    // The directive class
    clazz:Function
  ) {
    this.annotation = annotation;
    this.clazz = clazz;
  }
}

export class ArrayOfDirectiveClass {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(DirectiveClass));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}
