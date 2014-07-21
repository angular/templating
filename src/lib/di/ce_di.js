import {Provide} from 'di';

export function mixinCustomElementDi({type, providers = [], callbacks, rootInjector}) {
  var proto = type.prototype;
  var _createdCallback = proto[callbacks.created];
  var _attachedCallback = proto[callbacks.attached];
  var _detachedCallback = proto[callbacks.detached];
  proto[callbacks.created] = created;
  proto[callbacks.attached] = attached;
  proto[callbacks.detached] = detached;
  return proto;

  function created() {
    var self = this;

    // Use the element as "this" for custom elements
    function proxy() {
      type.apply(self, arguments);
      return self;
    }

    proxy.annotations = type.annotations || [];
    proxy.annotations.push(new Provide(type));
    proxy.parameters = type.parameters;
    var localProviders = [proxy, ...providers];
    if (this.classList.contains('ng-binder')) {
      // This is a hook for angular templates to provide additional providers,
      // e.g. decorator directives, ...
      this.ngInjectorFactory = injectorFactory;
    } else {
      injectorFactory([]);
    }

    function injectorFactory(extraProviders = []) {
      localProviders.push(...extraProviders);
      var injector = rootInjector.createChild({
        node: self, providers: localProviders, isShadowRoot: false
      });
      injector.get(type);
      self.ngData = {
        lastParent: null,
        lastPrevious: null,
        injector: injector
      };
      if (_createdCallback) {
        _createdCallback.call(self);
      }
      return injector;
    }
  }

  function attached() {
    if (this.ngInjectorFactory) {
      // If within an Angular template, the ViewFactory
      // will take care of appending the nodeInjector at the right place,
      // and manual changes afterwards are not allowed.
      return;
    }
    var injector = this.ngData.injector;
    var parentNode = this.parentNode,
        previousSibling = this.previousSibling;

    var parentChanged = !injector._parent || (parentNode !== this.ngData.lastParent);
    this.ngData.lastParent = parentNode;
    var moved = previousSibling !== this.ngData.previousSibling;
    this.ngData.lastPrevious = previousSibling;

    if (!parentChanged && !moved) {
      return;
    }
    // TODO: handle ShadowDOM correctly:
    // - don't provide shadowDOM flag in constructor of NodeInjector,
    //   but detect this when finding the parent injector in nodeMoved?
    injector.nodeMoved(parentChanged);
    if (_attachedCallback) {
      _attachedCallback.call(this);
    }
  }

  function detached() {
    if (this.ngInjectorFactory) {
      // If within an Angular template, the ViewFactory
      // will take care of appending the nodeInjector at the right place,
      // and manual changes afterwards are not allowed.
      return;
    }
    // Guard against:
    // - detach with immediate attach
    // - detach for children of a detached element
    if (!this.parentNode) {
      this.ngData.lastParent = null;
      this.ngData.lastPrevious = null;
      this.ngData.injector.remove();
    }
    if (_detachedCallback) {
      _detachedCallback.call(this);
    }
  }
}
