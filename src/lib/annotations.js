import {assert} from 'rtts-assert';
import {Inject} from 'di';

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
    if (obj.on) {
      for (var prop in obj.on) {
        assert(obj.on[prop]).is(assert.string);
      }
    }
    if (obj.providers) {
      assert(obj.providers).is(assert.arrayOf(Function));
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
    if ('shadowDOM' in obj) {
      assert(obj.shadowDOM).is(assert.boolean);
    }
    if (obj.shadowProviders) {
      assert(obj.shadowProviders).is(assert.arrayOf(Function));
    }
  }
}

export class ComponentDirective extends Directive {
  constructor(data:ComponentArgs=null) {
    super(data);
    // If the moduleId is not given, be sure to define it
    // so that the module_annotator can fill it!
    this.moduleId = this.moduleId || null;
  }
}

export var QueryScope = {
  LIGHT: 'light',
  SHADOW: 'shadow',
  DEEP: 'deep',
  THIS: 'this'
};

export class QueryListener {
  constructor({role, ordered = false}) {
    this.role = role;
    this.ordered = ordered;
  }
}

export class Queryable {
  constructor(role) {
    this.role = role;
  }
}

// Used to dynamically introduce new elements into the injector
// via @Inject(provider) where the provider has an ImplicitScope annotation
export class ImplicitScope {

}

// Annotation that enables the diAttached and diDetached callback
export class AttachAware extends Queryable {
  constructor() {
    super('attachAware');
  }
}

// Annotation that enables the domMoved callback
export class DomMovedAware extends Queryable {
  constructor() {
    super('domMovedAware');
  }
}
