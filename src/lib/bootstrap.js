import {Inject, TransientScope, Provide} from 'di';
import {rootWatchGroupProviders} from './watch_group';
import {RootInjector, NodeInjector} from './di/node_injector';
import {registerNgElement} from './ng_element';
import {ComponentLoader} from './component_loader';
import {DocumentReady} from './util/document_ready';
import {ViewFactory} from './view_factory';
import {AttachAwareListener} from './di/injector_queries';
import {Digest} from './digest';
import {valueProvider} from './util/misc';
import {FlushViews} from './view';

export class NgZone {
  constructor() {
    this.afterTasks = [];
    this.ngZone = window.zone.fork({
      afterTask: () => {
        this.afterTasks.forEach((afterTask) => {
          afterTask();
        });
      },
      onError: (err) => {
        // TODO(vojta): nice error handling for Tobias
        console.log(err.stack)
      }
    });
  }
  run(callback) {
    return this.ngZone.run(callback);
  }
  afterTask(callback) {
    this.afterTasks.push(callback);
  }
  // TODO: Add a method to run stuff outside of the Angular zone!
}

export function bootstrap() {
  // Note: Cannot create NgZone via the injector,
  // as we want everything that is created to be within NgZone.run...
  var ngZone = new NgZone();
  return ngZone.run(() => {
    var providers = [
      ...rootWatchGroupProviders(),
      valueProvider(NgZone, ngZone),
      AttachAwareListener,
      FlushViews
    ];
    var rootInjector = new RootInjector({providers, node:document});

    ngZone.afterTask(rootInjector.get(Digest));
    rootInjector.get(startNgApp);
    rootInjector.get(registerNgElement);
    rootInjector.get(FlushViews);
    return rootInjector;
  });
}

@Inject(ComponentLoader, DocumentReady, NgZone, ViewFactory, NodeInjector)
@TransientScope
export function startNgApp(componentLoader, documentReady, ngZone, viewFactory, nodeInjector) {
  var rootEl = document.documentElement;
  documentReady.then((doc) => {
    ngZone.run( ()=> {
      if (rootEl.hasAttribute('ng-config')) {
        componentLoader.loadFromElement(rootEl, ({directive})=>{
          var componentInjector = viewFactory._createComponent({
            element:rootEl,
            component:directive,
            parentNodeInjector:nodeInjector
          });
          componentInjector.appendTo(nodeInjector);
        });
      }
    });
  });
}
