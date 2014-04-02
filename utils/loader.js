// TODO: change the setup to transpile this as well,
// but not as a module!

// TODO: Support the ES6 loader here as well!

// TODO: Make this configurable via the requirejs config!
var REQJS_PLUGIN_NAME = 'templating_compiler';

patchRequireToUsePluginForHtmlFiles();

function patchRequireToUsePluginForHtmlFiles() {
  window.define = patchFn(window.define);
  window.require = patchFn(window.require);

  function patchFn(delegate) {
    for (var prop in delegate) {
      result[prop] = delegate[prop];
    }
    return result;

    function result() {
      var args = Array.prototype.slice.call(arguments);
      var depsIndex = -1;
      args.forEach(function(arg, index) {
        if (arg.splice) {
          depsIndex = index;
        }
      });
      if (depsIndex >= 0) {
        var deps = args[depsIndex];
        deps = deps.map(function(depName) {
          if (depName.endsWith('.html')) {
            depName = REQJS_PLUGIN_NAME+'!' + depName.substring(0, depName.length - 5);
          }
          return depName;
        });
        args[depsIndex] = deps;
      }
      return delegate.apply(this, args);
    }
  }
}
