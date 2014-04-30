import {loadBarrier} from './load_barrier';

window.NgPolymer = function(data) {
  var elName = data.element;
  var moduleName = data.module;
  var exportName = data.export;
  // TODO: resolve the moduleName using the current path in html imports...
  require(['templating', moduleName], loadBarrier(elName, function(templating, module) {
    var type = module[exportName];
    Polymer(elName, templating.mixinCustomElementDi({
      type: type,
      providers: data.providers || [],
      callbacks: {
        created: 'created',
        attached: 'attached',
        detached: 'detached'
      }
    }));
  }));
}

window.NgPlainCe = function(data) {
  var elName = data.element;
  var moduleName = data.module;
  var exportName = data.export;
  // TODO: resolve the moduleName using the current path in html imports...
  require(['templating', moduleName], loadBarrier(elName, function(templating, module) {
    var type = module[exportName];
    var proto = Object.createElement(HTMLElement.prototype);
    // Mixin the component into the element hierarchy
    type.prototype.__proto__ = proto;
    var proto = templating.mixinCustomElementDi({
      type: type,
      providers: data.providers || [],
      callbacks: {
        created: 'createdCallback',
        attached: 'attachedCallback',
        detached: 'detachedCallback'
      }
    });
    document.registerElement(elName, {proto: proto});
  }));
}