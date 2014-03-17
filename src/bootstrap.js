import {Injector} from 'di/injector';
import {Compiler} from 'templating/compiler';
import {ArrayOfClass} from 'templating/types';

// TODO: Think about how to test this!!

var apps = Array.prototype.slice.call(document.querySelectorAll('[ng-app]'));
var moduleScripts = Array.prototype.slice.call(document.querySelectorAll('module'));

var modulesSrc = moduleScripts.map((moduleScript) => { return moduleScript.getAttribute('src'); });

// TODO: Sytem.get here
require(modulesSrc, function() {
  var modules = Array.prototype.slice.call(arguments);
  var moduleClasses = extractClasses(modules);
  apps.forEach(function(appRootElement) {
    createApp(appRootElement, moduleClasses);
  });
});

function createApp(appRootElement, moduleClasses) {
  var rootInjector = new Injector();
  var compiler = rootInjector.get(Compiler);

  var vf = compiler.compileNodes([appRootElement], moduleClasses);
  vf.createView(rootInjector, {}, true);
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
