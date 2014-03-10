import {assert} from 'assert';

class DirectiveArgs {
  static assert(obj) {
    if (obj.selector) {
      assert(obj.selector).is(assert.string);
    }
  }
}

export class Directive {
  constructor(data:DirectiveArgs=null) {
    if (data) {
      for (var prop in data) {
        this[prop] = data[prop];
      }    
    }    
  }
}

export class DecoratorDirective extends Directive {
  constructor(data:DirectiveArgs=null) {
    super(data);
  }
}

export class TemplateDirective extends Directive {
  constructor(data:DirectiveArgs=null) {
    super(data);
  }
}

class ComponentArgs {
  static assert(obj) {
    DirectiveArgs.assert(obj);
    if (obj.template) {
      // TODO: this should be: assert(obj).is(assert.string, ViewFactory).
      // Can't use this here as:
      // - importing ViewFactory into annotations would lead to cyclic type dependencies
      // - prettyPrint in assert.js get's into an infinite loop for instances of ViewFactory
      //   test: use assert(obj).is(assert.string, Object)
      var type = typeof obj.template;
      if (type !== 'string' && type !== 'object') {
        assert.fail('expected either string of object');
      }
    }
  }
}

export class ComponentDirective extends Directive {
  constructor(data:ComponentArgs=null) {
    super(data);   
  }
}
