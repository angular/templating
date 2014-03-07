import {DirectiveClass} from './directive_class';
import {assert} from 'assert';

export class ContainsSelector {
  constructor(directiveClass:DirectiveClass, regexp:string){
    this.directiveClass = directiveClass;
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
