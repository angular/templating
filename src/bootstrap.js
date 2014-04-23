import {Injector, Inject, Provide} from 'di';
import {ModuleLoader} from './util/module_loader';
import {ArrayOfClass} from './types';
import {Global} from './global';
import {DocumentReady} from './util/document_ready';
import {ViewFactory} from './view_factory';
import {AnnotationProvider} from './util/annotation_provider';
import {ComponentDirective} from './annotations';

export function bootstrap() {
  var injector = new Injector();
  injector.get(Bootstrap)();
}

// TODO: Create tests for this
@Inject(Global, ModuleLoader, DocumentReady, AnnotationProvider)
export function Bootstrap(global, moduleLoader, documentReady, annotationProvider) {
  return bootstrap;

  function bootstrap() {
    return documentReady.then(function() {
      var moduleNames = findModuleNames(global.document, 'ng-app');
      return moduleLoader(moduleNames);
    }).then(function(ngAppModules) {
      var {components, provides} = findComponentsAndProvides(ngAppModules, annotationProvider);
      components.forEach(({clazz, selector}) => {
        var elements = Array.prototype.slice.call(global.document.querySelectorAll(selector));
        elements.forEach((element) => {
          bootstrapComponent(element, clazz, provides);
        });
      });
    }).catch(function(e) {
      // TODO: nice error handling
      console.log(e.stack)
    });
  }
}

function findModuleNames(doc, filterAttribute) {
  var modules = doc.querySelectorAll('module[src]');
  var res = [];
  var i;
  for (i=0; i<modules.length; i++) {
    if (modules[i].hasAttribute(filterAttribute)) {
      res.push(modules[i].getAttribute('src'));
    }
  }
  return res;
}

function findComponentsAndProvides(modules, annotationProvider) {
  var components = [];
  var provides = [];
  modules.forEach((module) => {
    var annotation, exportedObject;
    for (var exportName in module) {
      exportedObject = module[exportName];
      if (typeof exportedObject === 'function') {
        if (annotation = annotationProvider(module[exportName], Provide)) {
          provides.push(module[exportName]);
        } else if (annotation = annotationProvider(module[exportName], ComponentDirective)) {
          components.push({
            clazz: module[exportName],
            selector: annotation.selector
          });
        }
      }
    }
  });
  return {components, provides};
}

function bootstrapComponent(element, component, provides) {
  var rootView;
  window.zone.fork({
    afterTask: function () {
      if (rootView) {
        rootView.digest();
      }
    },
    onError: function(err) {
      // TODO(vojta): nice error handling for Tobias
      console.log(err.stack)
    }
  }).run(function() {
    var injector = new Injector(provides);
    var viewFactory = injector.get(ViewFactory);
    var template = viewFactory.createComponentTemplate(element, component);
    rootView = viewFactory.createRootView({template: template});
  });
}