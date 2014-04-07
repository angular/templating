import {Injector} from 'di';
import {Compiler} from './compiler/compiler';
import {ArrayOfClass} from './types';

// TODO: Create tests for this
export function bootstrap() {
  // TODO: Support the ES6 loader here as well!
  require(['document.html'], function(module) {
    module.promise.then(function(viewFactoriesAndModules) {
      viewFactoriesAndModules.viewFactories.forEach((viewFactory) => {
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
    });
  });
}
// TODO: Can't bootstrap automatically
// as this leads to problems in the unit tests