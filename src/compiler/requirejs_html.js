import {Injector} from 'di';
import {Compiler} from './compiler';
import {CompilerConfig} from './compiler_config';
import {ViewFactory, ElementBinder} from '../view_factory';

export function load(name, req, onload, config) {
  var promise;
  if (name === 'document') {
    // special case for bootstrap
    promise = createDocumentPromise();
  } else {
    promise = createDefaultPromise();
  }
  onload({
    __esModule: true,
    promise: promise
  });

  function createDefaultPromise() {
    var url = req.toUrl(name+'.html');
    var _doc;
    return loadText(url).then(function(doc) {
      var depNames = findModules(doc);
      _doc = doc;
      return requirePromise(req, depNames);
    }).then(function({moduleNames, modules}) {
      var exports = findExports(moduleNames, modules);
      var moduleClasses = extractClasses(modules);
      var compiler = createCompiler(config);
      var vf = compiler.compileChildNodes(_doc, moduleClasses);

      return {
        viewFactory: vf,
        modules: exports
      };
    });
  }

  function createDocumentPromise() {
    var doc = window.document;
    return ready().then(function() {
      var depNames = findModules(doc);
      return requirePromise(window.require, depNames);
    }).then(function({moduleNames, modules}) {
      var exports = findExports(moduleNames, modules);
      var moduleClasses = extractClasses(modules);
      var compiler = createCompiler(config);
      var apps = Array.prototype.slice.call(doc.querySelectorAll('[ng-app]'));
      var viewFactories = apps.map(function(appRootElement) {
        return compiler.compileNodes([appRootElement], moduleClasses);
      });

      return {
        viewFactories: viewFactories,
        modules: exports
      };
    });
  }

}
load.responseTypeContentSupported = isResponseTypeContentSupported();

function createCompiler(config) {
  // TODO: configure the injector given the requirejs config!
  var rootInjector = new Injector();
  return rootInjector.get(Compiler);
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

function findExports(moduleNames, modules) {
  return modules.map(function(module, index) {
    return {
      module: modules[index],
      name: moduleNames[index],
      type: modules[index][moduleNames[index]],
      dynamic: true
    };
  });
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

function ready( ) {
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
  return ready.promise;
};

function requirePromise(require, moduleNames) {
  return new Promise(function(resolve, reject) {
    // TODO: Support ES6 here
    require(moduleNames, function(...modules) {
      resolve({moduleNames, modules});
    });
  });
}

function loadText(url) {
  return new Promise(resolver);

  function resolver(resolve, reject) {
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
        reject(new Error('Error loading '+url+': aborted'), xhr);
      }
    }
    xhr.send();

    function onreadystatechange() {
      if (xhr.readyState === 4) {
        done = true;
        if (xhr.status !== 200) {
          reject(new Error('Error loading '+url+': '+xhr.status+' '+xhr.statusText), xhr);
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
          resolve(doc);
        }
      }
    }

  }
}
