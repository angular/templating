import {Injector, Inject, Provide} from 'di';
import {ModuleLoader} from './util/module_loader';
import {ArrayOfClass} from './types';
import {Global} from './global';
import {DocumentReady} from './util/document_ready';
import {ViewFactory} from './view_factory';
import {AnnotationProvider} from './util/annotation_provider';

export function bootstrap() {
  var injector = new Injector();
  injector.get(Bootstrap)();
}

var SKIP_BOOTSTRAP = 'skip bootstrap';

// TODO: Create tests for this
@Inject(Global, ModuleLoader, DocumentReady, AnnotationProvider)
export function Bootstrap(global, moduleLoader, documentReady, annotationProvider) {
  return bootstrap;

  function bootstrap() {
    return documentReady.then(function() {
      if (!global.document.documentElement.hasAttribute('ng-app')) {
        throw SKIP_BOOTSTRAP;
      }
      return moduleLoader([getLastPathPart(global.location.pathname)]);
    }).then(function(modules) {
      var module = modules[0];
      return module.promise;
    }).then(function(templateAndModules) {
      var template = templateAndModules.template;
      var modules = templateAndModules.modules;

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
        // TODO: Provide ApplicationMode = 'app' into the injector
        // to distinguish it from a custom element.
        var rootInjector = new Injector(findProvides(modules, annotationProvider));
        var viewFactory = rootInjector.get(ViewFactory);
        rootView = viewFactory.createRootView({
          template: template
        });

        global.document.body.innerHTML = '';
        rootView.appendTo(global.document.body)
      });
      return template;
    }).catch(function(e) {
      if (e === SKIP_BOOTSTRAP) {
        return;
      } else {
        console.log(e.stack)
        throw e;
      }
    });
  }
}

function getLastPathPart(path) {
  var parts = path.split('/');
  return parts[parts.length-1];
}

function findProvides(modules, annotationProvider) {
  var res = [], module, exportValue;
  for (var moduleName in modules) {
    module = modules[moduleName];
    for (var exportName in module) {
      exportValue = module[exportName];
      if (typeof exportValue === 'function') {
        if (annotationProvider(exportValue, Provide)) {
          res.push(exportValue);
        }
      }
    }
  }
  return res;
}