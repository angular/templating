import {Inject} from 'di';
import {Compiler} from '../compiler/compiler';
import {ModuleLoader} from '../util/module_loader';
import {DocumentLoader} from './document_loader';
import {Precompile} from './precompiler';

@Inject(DocumentLoader, ModuleLoader, Compiler, Precompile)
export function TemplateLoader(documentLoader, moduleLoader, compiler, precompile) {
  return loadTemplate;

  function loadTemplate(templateUrl, moduleBasePath = null, serialize = false) {
    var _doc;
    return documentLoader(templateUrl).then(function(doc) {
      var moduleNames = findModuleNames(doc, moduleBasePath || templateUrl);
      _doc = doc;
      return loadModules(moduleNames);
    }).then(function(modules) {
      var moduleClasses = extractClasses(modules);
      var templatesWithId = Array.prototype.slice.call(_doc.querySelectorAll('[ng-template-id]'));
      if (templatesWithId.length) {
        var compiledTemplates = templatesWithId.map(function(appRootElement) {
          return {
            id: appRootElement.getAttribute('ng-template.id'),
            template: compiler.compileNodes([appRootElement], moduleClasses)
          }
        });
        return {
          templates: compiledTemplates,
          modules: modules,
          es6Source: serialize ? precompile({templates: compiledTemplates}, modules) : null
        };
      } else {
        // We need to convert the <body> tag into a div
        // to hold the loaded elements as <body> can't be added to other
        // elements as child.
        var div = _doc.createElement('div');
        while (_doc.body.firstChild) {
          div.appendChild(_doc.body.firstChild);
        }
        var template = compiler.compileChildNodes(div, moduleClasses);
        return {
          template: template,
          modules: modules,
          es6Source: serialize ? precompile({template: template}, modules) : null
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
