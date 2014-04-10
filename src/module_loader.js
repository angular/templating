import {Inject} from 'di';
import {Global} from './global';

// TODO: Support ES6 loader here as well!
@Inject(Global)
export function ModuleLoader(global) {
  return function loadModules(moduleNames) {
    return new global.Promise(function(resolve, reject) {
      global.require(moduleNames, function(...modules) {
        resolve(modules);
      });
    });
  }
}
