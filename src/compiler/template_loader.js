import {Inject} from 'di';
import {Compiler} from './compiler';
import {ModuleLoader} from '../module_loader';
import {DocumentLoader} from './document_loader';

@Inject(DocumentLoader, ModuleLoader, Compiler)
export function TemplateLoader(documentLoader, moduleLoader, compiler) {
  return loadTemplate;

  function loadTemplate(templateUrl, moduleBasePath = null) {
    var _doc;
    return documentLoader(templateUrl).then(function(doc) {
      var moduleNames = findModuleNames(doc, moduleBasePath || templateUrl);
      _doc = doc;
      return loadModules(moduleNames);
    }).then(function(modules) {
      var moduleClasses = extractClasses(modules);
      var apps = Array.prototype.slice.call(_doc.querySelectorAll('[ng-app]'));
      if (apps.length) {
        var viewFactories = apps.map(function(appRootElement) {
          return compiler.compileNodes([appRootElement], moduleClasses);
        });
        return {
          appViewFactories: viewFactories,
          modules: modules
        };
      } else {
        // We need to convert the <body> tag into a div
        // to hold the loaded elements as <body> can't be added to other
        // elements as child.
        var div = _doc.createElement('div');
        while (_doc.body.firstChild) {
          div.appendChild(_doc.body.firstChild);
        }
        var vf = compiler.compileChildNodes(div, moduleClasses);
        return {
          viewFactory: vf,
          modules: modules
        };
      }
    });
  }

  function loadModules(moduleNames) {
    return moduleLoader(moduleNames).then(function(modules) {
      var modulesWithNames = {};
      modules.forEach((module, index)=>{
        modulesWithNames[moduleNames[index]] = modules[index];
      });
      return modulesWithNames;
    });
  }

  function findModuleNames(doc, moduleBasePath) {
    var modules = doc.querySelectorAll('module[src]');
    var res = [];
    var i;
    for (i=0; i<modules.length; i++) {
      res.push(adjustRelativeModulePath(
        modules[i].getAttribute('src'), moduleBasePath
      ));
    }
    return res;
  }
  function extractClasses(modules) {
    var res = [];
    for (var moduleName in modules) {
      var module = modules[moduleName];
      var exportedValue;
      for (var prop in module) {
        exportedValue = module[prop];
        if (typeof exportedValue === 'function') {
          res.push(exportedValue);
        }
      }
    }
    return res;
  }

  function adjustRelativeModulePath(path, basePath) {
    if (path.charAt(0) === '.') {
      if (basePath.indexOf('/') === -1) {
        return path;
      }

      return basePath.replace(/\/[^\/]*$/, '') + path.substring(1);
    }

    return path;
  }
}
