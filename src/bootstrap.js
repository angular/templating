import {Injector} from 'di';
import {Compiler} from './compiler/compiler';
import {ArrayOfClass} from './types';

// TODO: Create tests for this
export function bootstrap() {
  // TODO: Support the ES6 loader here as well!
  require(['document.html'], function(module) {
    module.promise.then(function(viewFactoriesAndModules) {
      viewFactoriesAndModules.viewFactories.forEach(function(vf) {
        var rootInjector = new Injector();
        var rootView = vf.createRootView(rootInjector, {}, true);

        // TODO: Integrate with Zone.js and remove the setInterval!
        window.setInterval(function(){
          rootView.digest();
        }, 100);
      });
    });
  });
}
// TODO: Can't bootstrap automatically
// as this leads to problems in the unit tests