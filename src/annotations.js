import {assert} from 'rtts-assert';
import {CompiledTemplatePromise} from './types';

class DirectiveArgs {
  static assert(obj) {
    if (obj.selector) {
      assert(obj.selector).is(assert.string);
    }
    if (obj.observe) {
      for (var prop in obj.observe) {
        assert(obj.observe[prop]).is(assert.string);
      }
    }
    if (obj.bind) {
      for (var prop in obj.bind) {
        assert(obj.bind[prop]).is(assert.string);
      }
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
      assert(obj.template).is(CompiledTemplatePromise);
    }
  }
}

export class ComponentDirective extends Directive {
  constructor(data:ComponentArgs=null) {
    super(data);
  }
}
