import {mixinCustomElementDi as _mixinCustomElementDi} from './ce_di';
import {AttachAwareListener} from './injector_queries';
import {RootInjector} from './node_injector';
import {CustomElementAsyncTaskQueue} from '../task_queue';

var rootInjector;

export function bootstrap() {
  var providers = [AttachAwareListener, CustomElementAsyncTaskQueue];
  rootInjector = new RootInjector({providers:providers, node:document});
}

export function mixinCustomElementDi({proto, type, providers, callbacks}) {
  return _mixinCustomElementDi({proto, type, providers, callbacks, rootInjector});
}
