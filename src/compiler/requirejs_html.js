import {Injector} from 'di';
import {Compiler} from './compiler';
import {CompilerConfig} from './compiler_config';
import {ViewFactory, ElementBinder} from '../view_factory';

export function load(name, req, onload, config) {
  if (name === 'document') {
    // special case for bootstrap
    return loadBootstrapApps(window.document, req, onload, config);
  }
  onload({
    __esModule: true,
    promise: new Promise(resolver)
  });

  function resolver(resolve, reject) {
    rejectOnError(function() {
      var compiler = createCompiler(config);
      var url = req.toUrl(name+'.html');
      loadText(url, rejectOnError( (error, doc) => {
        if (error) {
          reject(error);
        } else {
          var depNames = findModules(doc);
          req(depNames, rejectOnError(function(...modules) {
            var modulesWithNames = [];
            modules.forEach(function(module, index) {
              modulesWithNames.push({
                module: modules[index],
                name: depNames[index],
                type: modules[index][depNames[index]],
                dynamic: true
              });
            });
            var vf = compiler.compileChildNodes(doc, extractClasses(modules));
            resolve({
              viewFactory: vf,
              modules: modulesWithNames
            });
          }));
        }
      }));
    })();

    function rejectOnError(callback) {
      return function(...args) {
        try {
          return callback(...args);
        } catch (e) {
          reject(e);
          throw e;
        }
      }
    }
  }
}
load.responseTypeContentSupported = isResponseTypeContentSupported();

export function loadBootstrapApps(doc, req, onload, config) {
  onload({
    __esModule: true,
    promise: new Promise(resolver)
  });

  function resolver(resolve, reject) {
    rejectOnError(function() {
      var compiler = createCompiler(config);
      ready(rejectOnError(function() {
        var appViewFactories = [];
        var apps = Array.prototype.slice.call(doc.querySelectorAll('[ng-app]'));
        var depNames = findModules(doc);

        // TODO: use Sytem.get here
        var modulesWithNames = {};
        require(depNames, rejectOnError(function(...modules) {
          modules.forEach(function(module, index) {
            modulesWithNames[depNames[index]] = module;
          });

          apps.forEach(function(appRootElement) {
            var moduleClasses = extractClasses(modules);

            var vf = compiler.compileNodes([appRootElement], moduleClasses);
            appViewFactories.push(vf);
          });

          resolve({
            viewFactories: appViewFactories,
            modules: modulesWithNames
          });
        }));
      }));
    })();

    function rejectOnError(callback) {
      return function(...args) {
        try {
          return callback(...args);
        } catch (e) {
          reject(e);
          throw e;
        }
      }
    }
  }
}

function createCompiler(config) {
  // TODO: configure the injector given the requirejs config!
  var rootInjector = new Injector();
  return rootInjector.get(Compiler);
}

function loadText(url, callback) {
  var done = false;
  var xhr = new window.XMLHttpRequest();
  xhr.open('GET', url, true);
  if (load.responseTypeContentSupported) {
    xhr.responseType = 'document';
  } else {
    xhr.responseType = 'text/html';
  }
  xhr.onreadystatechange = onreadystatechange;
  xhr.onabort = xhr.onerror = function() {
    if (!done) {
      done = true;
      callback(new Error('Error loading '+url+': aborted'), xhr);
    }
  }
  xhr.send();

  function onreadystatechange() {
    if (xhr.readyState === 4) {
      done = true;
      if (xhr.status !== 200) {
        callback(new Error('Error loading '+url+': '+xhr.status+' '+xhr.statusText), xhr);
      } else {
        var doc;
        doc = document.createElement('div');
        if (xhr.responseXML) {
          // Dont' use the <body> tag itself as we can't wrap
          // it into other divs, ...
          // TODO: Add a test for this!
          while (xhr.responseXML.body.firstChild) {
            doc.appendChild(xhr.responseXML.body.firstChild);
          }
        } else {
          doc.innerHTML = xhr.responseText;
        }
        callback(null, doc);
      }
    }
  }
}

function findModules(doc) {
  var modules = doc.querySelectorAll('module[src]');
  var res = [];
  var i;
  for (i=0; i<modules.length; i++) {
    res.push(modules[i].getAttribute('src'));
  }
  return res;
}

function extractClasses(modules) {
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

function isResponseTypeContentSupported() {
  if (!window.XMLHttpRequest)
    return false;
  var req = new window.XMLHttpRequest();
  req.open('GET', window.location.href, false);
  try {
    req.responseType = 'document';
  } catch(e) {
    return true;
  }
  return false;
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