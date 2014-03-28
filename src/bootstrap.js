import {Injector} from 'di';
import {Compiler} from './compiler';
import {ArrayOfClass} from './types';

// TODO: Create tests for this

ready(function() {

  var apps = Array.prototype.slice.call(document.querySelectorAll('[ng-app]'));
  var moduleScripts = Array.prototype.slice.call(document.querySelectorAll('module'));
  var modulesSrc = moduleScripts.map((moduleScript) => { return moduleScript.getAttribute('src'); });

  // TODO: use Sytem.get here
  require(modulesSrc, function() {
    var modules = Array.prototype.slice.call(arguments);
    apps.forEach(function(appRootElement) {
      bootstrap(appRootElement, modules);
    });
  });
});

export function bootstrap(appRootElement, modules) {
  var moduleClasses = extractClasses(modules);
  var rootInjector = new Injector();
  var compiler = rootInjector.get(Compiler);

  var vf = compiler.compileNodes([appRootElement], moduleClasses);
  var rootView = vf.createRootView(rootInjector, {}, true);

  // TODO: Integrate with Zone.js and remove the setInterval!
  window.setInterval(function(){
    rootView.digest();
  }, 100);
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

function ready( callback ) {
  if (!ready.promise) {
    ready.promise = new Promise(function(resolve, reject) {
      // Catch cases where $(document).ready() is called after the browser event has already occurred.
      // we once tried to use readyState "interactive" here, but it caused issues like the one
      // discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
      if ( document.readyState === "complete" ) {
        resolve();
      } else {
        // Use the handy event callback
        document.addEventListener( "DOMContentLoaded", completed, false );
        // A fallback to window.onload, that will always work
        window.addEventListener( "load", completed, false );
      }
   
      function completed() {
        document.removeEventListener( "DOMContentLoaded", completed, false );
        window.removeEventListener( "load", completed, false );
        resolve();
      }
   });
  }
  ready.promise.then(callback);
};
