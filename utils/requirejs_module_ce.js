/*
 * Polyfill for <module src="..."> that loads a module via requirejs.
 *
 * Usage: <script type="module" is="requirejs-module" src="path"></script>
 * The element will be decorated with the property "promise" that will resolve
 * to the loaded module.
 */
(function() {
  var ScriptModuleProto = Object.create(HTMLScriptElement.prototype);
  var modulePromises = {};
  var nextId = 0;

  // TODO: Somehow we can't store the promise on the node.
  // This only occurs some times, e.g. when adding a breakpoint this is fine!
  Object.defineProperty(ScriptModuleProto, 'promise', {
    get: function() {
      return modulePromises[this.getAttribute('load-id')];
    }
  });

  ScriptModuleProto.createdCallback = function() {
    // can't use the src attribute here as
    // we want to get the relative paths from html imports!
    var moduleUrl = this.src.substring(window.location.href.length);
    var promise = new Promise(function(resolve) {
      require([moduleUrl], function(module) {
        resolve(module);
      });
    });
    var id = nextId++;
    this.setAttribute('load-id', id);
    modulePromises[id] = promise;
  };

  document.registerElement('requirejs-module', {
    prototype: ScriptModuleProto,
    // extend <script> and not <module> to get the automatic path resolution
    // of <script> tgas when combined with html imports.
    extends: 'script'
  });
})();
