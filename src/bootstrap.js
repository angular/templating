import {Injector, Inject} from 'di';
import {ModuleLoader} from './module_loader';
import {ArrayOfClass} from './types';
import {Global} from './global';
import {DocumentReady} from './document_ready';

export function bootstrap() {
  var injector = new Injector();
  injector.get(Bootstrap)();
}

// TODO: Create tests for this
@Inject(Global, ModuleLoader, DocumentReady)
export function Bootstrap(global, moduleLoader, documentReady) {
  return bootstrap;

  function bootstrap() {
    return documentReady.then(function() {
      return moduleLoader([getLastPathPart(global.location.href)]);
    }).then(function(modules) {
      var module = modules[0];
      return module.promise;
    }).then(function(viewFactoriesAndModules) {
      var appViewFactories = viewFactoriesAndModules.appViewFactories;
      if (!appViewFactories) {
        return;
      }
      appViewFactories.forEach((viewFactory) => {
        var rootView;
        window.zone.fork({
          onZoneLeave: function () {
            if (rootView) {
              rootView.digest();
            }
          }
        }).run(function() {
          var rootInjector = new Injector();
          rootView = viewFactory.createRootView(rootInjector, {}, true);
        });
      });
      return appViewFactories;
    });
  }
}

// TODO: Can't bootstrap automatically
// as this leads to problems in the unit tests

function getLastPathPart(path) {
  var parts = path.split('/');
  return parts[parts.length-1];
}