import {WatchParser} from './watch_parser';
import {Parser} from 'expressionist';

import { GetterCache } from 'watchtower';
import { RootWatchGroup as WtRootWatchGroup, PureFunctionAST} from 'watchtower';

import { Inject, Provide, Injector, InjectParent } from 'di';

import { NodeInjector } from './di/node_injector';
import { AttachAware } from './annotations';

export class WatchGroup {
  constructor() {
    this._cachedWatches = [];
  }
  // TODO: Cannot mix destrucuring arguments with types
  watch({expression, callback, context, collection = false}) {
    // TODO: How to get the filters??
    // -> they should be defined in the modules that the template
    //    imports resp. in the data that is given to compile()!
    var filters = null;
    var watchAst = this._parser.parse(expression, filters, collection, context);
    this._cachedWatches.push({
      watchAst, callback
    });
    if (this._watchGrp) {
      this._watchGrp.watchExpression(watchAst, callback);
    }
  }
  _afterAttached() {
    // TODO: Right now we need to recreate the WatchGroup and the watches
    // after every attach, as WatchTower has a bug when creating watches before attaching the WatchGroup!
    this._cachedWatches.forEach(({watchAst, callback}) => {
      this._watchGrp.watchExpression(watchAst, callback);
    });
  }
}

export class ChildWatchGroup extends WatchGroup {
  // TODO: Not working, as RootWatchGroup is defined later in the file
  // @Inject(WatchParser, RootWatchGroup)
  // TODO: Refactor this to create the watchGroup from the watchGroupRoot
  // in the constructor and not cache the watches afterwards!
  constructor(parser, rootWatchGroup) {
    super();
    this._parser = parser;
    this._root = rootWatchGroup;
  }
  // TODO: Use @InjectParent when di.js provides it
  diAttached(@InjectParent(WatchGroup) parentWatchGroup) {
    // TODO: Right now we need to recreate the WatchGroup and the watches
    // after every attach, as WatchTower has a bug when creating watches before attaching the WatchGroup!
    this._watchGrp = this._root._watchGrp.newGroup();
    parentWatchGroup._watchGrp.addGroup(this._watchGrp);
    this._afterAttached();
  }
  diDetached() {
    this._watchGrp.remove();
    this._watchGrp = null;
  }
}

export function childWatchGroupProviders() {

  @Inject(ChildWatchGroup)
  @Provide(WatchGroup)
  function childWatchGroupProvider(childWatchGroup) {
    return childWatchGroup;
  }

  return [childWatchGroupProvider, ChildWatchGroup];
}

// TODO: Change Watchtower to allow the ObserverSelector to detect
// that the value is not observable
export class NoneObserver {
  open(callback){}
  close() {}
}

// TODO: Maybe move this into a separate file...
export class NodeObserver {
  constructor(node, property, events){
    this.node = node;
    this.property = property;
    this.events = events;
    this.listener = ()=>{
      this.callback(this._nodeValue());
    }
  }
  _nodeValue() {
    var val = this.node[this.property];
    return val ? val : null;
  }

  open(callback){
    this.callback = callback;

    this.events.forEach((event) => {
      this.node.addEventListener(event, this.listener, false);
    });

    this.node.addEventListener('propchange', this.listener, false);

    return this._nodeValue();
  }

  close(){
    this.callback = null;

    this.events.forEach((event) => {
      this.node.removeEventListener(event, this.listener);
    });

    this.node.removeEventListener('propchange', this.listener, false);
  }
}

export class ObserverSelector {
  getObserver(obj, field) {
    var isNode = obj && !!obj.nodeName;
    if (!isNode) {
      return null;
    }
    var injector = NodeInjector.find(obj);
    var changeEventConfig = injector.get(ChangeEventConfig);
    var events = [];
    changeEventConfig.forEach((config) => {
      if (config.nodeName === obj.nodeName.toLowerCase()) {
        config.properties.forEach((property) => {
          if (property === field || (property === 'NATIVE' && isNodeDomApi(obj, field))) {
            events.push(...config.events);
          }
        });
      }
    });
    if (events.length) {
      // TODO: When we watch multiple fields on the same element, don't install
      // the listeners twice.
      return new NodeObserver(obj, field, events);
    } else {
      if (isNodeDomApi(obj, field)) {
        return new NoneObserver();
      } else {
        return null;
      }
    }
  }
}

@AttachAware
export class RootWatchGroup extends WatchGroup {
  @Inject(WatchParser, ObserverSelector)
  constructor(parser, observerSelector) {
    super();
    this._parser = parser;
    this._observerSelector = observerSelector;
    this._root = this;
    this._watchGrp = new WtRootWatchGroup(new GetterCache({}), observerSelector, {});
  }
  digestOnce() {
    return this._watchGrp.detectChanges(null);
    // return this._watchGrp.detectChanges(null, (log) => {console.log(log);});
  }
  diAttached() {
    this._afterAttached();
  }
}

// TODO: Why is this needed?
// Should be able to ask for RootWatchGroup using WatchGroup AND RootWatchGroup
// -> used to be a bug in DI, double check!
export function rootWatchGroupProviders() {
  @Inject(RootWatchGroup)
  @Provide(WatchGroup)
  function rootWatchGroupProvider(rootWatchGroup) {
    return rootWatchGroup;
  }

  return [RootWatchGroup, rootWatchGroupProvider];
}

ChildWatchGroup.annotations = [
  new Inject(WatchParser, RootWatchGroup),
  new AttachAware()
];

export function ChangeEventConfig() {
  return [
    {nodeName: 'input', events: ['input', 'change'], properties: ['NATIVE']},
    {nodeName: 'textarea', events: ['input', 'change'], properties: ['NATIVE']},
    {nodeName: 'select', events: ['change'], properties: ['NATIVE']}
  ];
}

export function isNodeDomApi(node, property) {
  if (!node || !node.nodeName) {
    return false;
  }
  var nodeName = node.nodeName.toLowerCase();
  var customElementRE = /.*-.*/;
  if (nodeName.match(customElementRE)) {
    nodeName = 'div';
  }
  var cache = isNodeDomApi.cache;
  if (!cache) {
    cache = isNodeDomApi.cache = {};
  }
  if (!cache[nodeName]) {
    var protoEl;
    if (nodeName === '#text') {
      protoEl = document.createTextNode('');
    } else {
      protoEl = document.createElement(nodeName);
    }
    var propNames = Object.getOwnPropertyNames(protoEl);
    var nodeCache = {};
    propNames.forEach((propName) => {nodeCache[propName] = true});
    cache[node.nodeName] = nodeCache;
  }
  return !!cache[node.nodeName][property];
}
