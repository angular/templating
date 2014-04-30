import {Inject, TransientScope, Injector} from 'di';
import {QueryListener, QueryScope, ImplicitScope, AttachAware} from '../annotations';
import {NodeInjector} from './node_injector';
import {AsyncTaskQueue} from '../task_queue';

export class InjectQuery extends Inject {
  constructor(role, scope = QueryScope.LIGHT) {
    @ImplicitScope
    @AttachAware
    @QueryListener({role: role, ordered:true})
    @Inject(NodeInjector, AsyncTaskQueue)
    function arrayProvider(nodeInjector, taskQueue) {
      var list = [];
      var attached = false;
      var valid = false;
      var refreshScheduled = false;
      list.diAttached = diAttached;
      list.diDetached = () => { attached = false };
      list.queryChanged = () => { valid = false; refresh(); };
      return list;

      // Ask for the injector, as that will always change...
      @Inject(Injector)
      function diAttached(injector) {
        attached = true;
        refresh();
      }

      function refresh() {
        if (!attached || valid || refreshScheduled) {
          return;
        }
        refreshScheduled = true;
        taskQueue(() => {
          if (!attached) {
            return;
          }
          refreshScheduled = false;
          valid = true;
          var queryables = nodeInjector._findQueryables({role, scope});
          list.length = 0;
          queryables.forEach(({injector, instances}) => {
            list.push(...instances);
          });
        });
      }
    }

    super(arrayProvider);
  }
}

@QueryListener({role: 'attachAware', ordered: false})
export function AttachAwareListener() {
  var STORAGE_PROPERTY = '_attachAwareCache';
  return {
    queryChanged: queryChanged
  };

  function queryChanged(sourceInjector, addRemove) {
    var changes = sourceInjector._findQueryables({scope: QueryScope.DEEP, role: 'attachAware'});
    changes.forEach(({injector, instances}) => {
      if (addRemove === -1) {
        // removal
        instances.forEach((instance, index) => {
          if (instance && instance.diDetached) {
            instance.diDetached();
          }
        });
        injector[STORAGE_PROPERTY] = [];
      } else if (addRemove === 1) {
        // addition
        var injectorLastParams = injector[STORAGE_PROPERTY] || [];
        var injectorCurrParams = injector[STORAGE_PROPERTY] = [];
        instances.forEach((instance, index) => {
          @TransientScope
          function proxy(...params) {
            return params;
          }

          // TODO: why diAttached? Why not use attachedCallback / attached?
          // Or maybe: 'dependenciesChanged?'
          if (!instance || !instance.diAttached) {
            return;
          }
          if (instance.diAttached.annotations) {
            proxy.annotations.push(...instance.diAttached.annotations);
          }
          proxy.parameters = instance.diAttached.parameters;
          var currParams = injector.get(proxy);
          injectorCurrParams[index] = currParams;

          var localLastParams = injectorLastParams[index];
          if (!localLastParams) {
            instance.diAttached(...currParams);
          } else if (!arrayEqual(currParams, localLastParams)) {
            if (instance.diDetached) {
              instance.diDetached();
            }
            instance.diAttached(...currParams);
          }
        });
      }
    });
  }
}

function arrayEqual(arr1, arr2) {
  if (arr1 === arr2) {
    return true;
  }
  if (!arr1 || !arr2) {
    return false;
  }
  if (arr1.length !== arr2.length) {
    return false;
  }
  for (var i=0; i<arr1.length; i++) {
    if (arr1[i] !== arr2[i]) {
      return false;
    }
  }
  return true;
}