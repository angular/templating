import {Injector, Inject} from 'di';
import {ModuleLoader} from './module_loader';
import {ArrayOfClass} from './types';
import {Global} from './global';
import {DocumentReady} from './document_ready';

export function bootstrap(compileTemplatesOnTheFly = true) {
  var injector = new Injector();
  injector.get(Bootstrap)(compileTemplatesOnTheFly);
}

// TODO: Create tests for this
@Inject(Global, ModuleLoader, DocumentReady)
export function Bootstrap(global, moduleLoader, documentReady) {
  return bootstrap;

  function bootstrap(compileTemplatesOnTheFly) {
    return documentReady.then(function() {
      return moduleLoader([getLastPathPart(global.location.pathname)]);
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
          },
          onError: function(err) {
            // TODO(vojta): nice error handling for Tobias
            console.log(err.stack)
          }
        }).run(function() {
          var rootInjector = new Injector();
          rootView = viewFactory.createRootView(rootInjector, {}, true);

          if (!compileTemplatesOnTheFly) {
            rootView.appendTo(document.body)
          }
        });
      });
      return appViewFactories;
    }, function(e) {
      console.log(e.stack)
    });
  }
}

// TODO: Can't bootstrap automatically
// as this leads to problems in the unit tests

function getLastPathPart(path) {
  var parts = path.split('/');
  return parts[parts.length-1];
}
