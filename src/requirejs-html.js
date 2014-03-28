import {Injector} from 'di/injector';
import {Compiler} from './compiler';
import {CompilerConfig} from './compiler_config';
import {ViewFactory, ElementBinder} from 'templating/view_factory';

// TODO: How to configure this injector??
// TODO: Where to get the CompilerConfig from??
var injector = new Injector();
var compiler = injector.get(Compiler);

export function load(name, req, onload, config) {
  var rootBinder = new ElementBinder();
  rootBinder.setLevel(0);
  // Return an empty ViewFactory that we fill later on.
  // Because of this we won't get into problems with cycles that
  // have been created through the ViewFactory.
  
  // TODO: Return a promise instead of the actual
  // ViewFactory!!!
  var vf = new ViewFactory(document.createElement('div'), [rootBinder]);
  onload({
    __esModule: true,
    viewFactory: vf
  });

  // TODO: read out the require config and instantiate the
  // compiler here!
  // ?? Maybe pass the compilerConfig to every call of the compiler ??
  var url = req.toUrl(name+'.html');
  loadText(url, function(error, doc) {
    if (error) {
      onload.error(error);
    } else {
      try {
        var depNames = findModules(doc);
        req(depNames, function(...modules) {
          // TODO: Add try/catch
          var realVf = compiler.compileChildNodes(doc, extractClasses(modules));
          vf.templateContainer = realVf.templateContainer;
          vf.elementBinders = realVf.elementBinders;
          console.log(vf);
        });
      } catch (e) {
        onload.error(e);
      }
    }
  });
}
load.responseTypeContentSupported = isResponseTypeContentSupported();

function loadText(url, callback) {
  var done = false;
  var xhr = new XMLHttpRequest();
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
        if (load.responseTypeContentSupported) {
          doc = xhr.responseXML;
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
