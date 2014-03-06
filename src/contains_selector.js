import {Directive} from './annotations';
import {assert} from 'assert';

export class ContainsSelector {
  constructor(annotation:Directive, regexp:string){
    this.annotation = annotation;
    this.regexp = new RegExp(regexp);
  }
}

export class ArrayOfContainsSelector {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(ContainsSelector));
  }
  constructor() {
    assert.fail('type is not instantiable');
  }
}