import {Injector} from 'di/injector';
import {Compiler} from 'templating/compiler';
import {ArrayOfClass} from 'templating/types';

// TODO: Create tests for this

var apps = Array.prototype.slice.call(document.querySelectorAll('[ng-app]'));
var moduleScripts = Array.prototype.slice.call(document.querySelectorAll('module'));

var modulesSrc = moduleScripts.map((moduleScript) => { return moduleScript.getAttribute('src'); });

// TODO: use Sytem.get here
require(modulesSrc, function() {
  var modules = Array.prototype.slice.call(arguments);
  var moduleClasses = extractClasses(modules);
  apps.forEach(function(appRootElement) {
    createApp(appRootElement, moduleClasses);
  });
});

function createApp(appRootElement, moduleClasses) {
  // TODO: Wait until all modules have been loaded!
  window.setTimeout(function() {
    var rootInjector = new Injector();
    var compiler = rootInjector.get(Compiler);

    var vf = compiler.compileNodes([appRootElement], moduleClasses);
    var rootView = vf.createRootView(rootInjector, {}, true);

    // TODO: Integrate with Zone.js and remove the setInterval!
    window.setInterval(function(){
      rootView.digest();
    }, 100);

}, 1000)
}

function extractClasses(modules):ArrayOfClass {
  var res = [];
  modules.forEach( (module) => {
    var exportedValue;
    for (var prop in module) {
      exportedValue = module[prop];
      if (typeof exportedValue === 'function') {
        res.push(exportedValue);
      }
    }
  });
  return res;
}
