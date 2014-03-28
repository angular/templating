import {Injector} from 'di';
import {Compiler} from './compiler';
import {CompilerConfig} from './compiler_config';
import {ViewFactory, ElementBinder} from './view_factory';

var injector = new Injector();
var compiler = injector.get(Compiler);

export function load(name, req, onload, config) {
  // TODO: read out the require config and instantiate the
  // compiler here (with the correct CompilerConfig)
  onload({
    __esModule: true,
    viewFactory: new Promise(resolver)
  });

  function resolver(resolve, reject) {
    rejectOnError(()=>{
      var url = req.toUrl(name+'.html');
      loadText(url, rejectOnError( (error, doc) => {
        if (error) {
          reject(error);
        } else {
          var depNames = findModules(doc);
          req(depNames, rejectOnError(function(...modules) {
            // TODO: Add try/catch
            var vf = compiler.compileChildNodes(doc, extractClasses(modules));
            resolve(vf);
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
        if (xhr.responseXML) {
          doc = xhr.responseXML.body;
        } else {
          doc = document.createElement('div');
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
