import { Inject } from 'di';
import { ChangeNotifier } from 'watchtower';

export function ChangeEventConfig() {
  return [
    {nodeName: 'input', events: ['input', 'change'], properties: ['value', 'valueAsDate', 'valueAsNumber']},
    {nodeName: 'textarea', events: ['input', 'change'], properties: ['value']},
    {nodeName: 'select', events: ['change'], properties: ['value']}
  ];
}

export class NodeAwareChangeNotifier extends ChangeNotifier {
  @Inject(ChangeEventConfig)
  constructor(config) {
    super();
    this.propertyHasEvents = {};
    this.nodeNameEvents = {};
    config.forEach((entry) => {
      var nodeName = entry.nodeName.toLowerCase();
      var events = this.nodeNameEvents[nodeName];
      if (!events) {
        events = [];
        this.nodeNameEvents[nodeName] = events;
      }
      events.push(...entry.events);
      entry.properties.forEach((property) => {
        this.propertyHasEvents[hasEventsKey(nodeName, property)] = true;
      });
    });
    this.eventListener = (event)=>{
      var node = event.target;
      while (node) {
        this.notify(node);
        node = node.parentNode;
      }
    }
  }
  isNotifyOnly(object, fieldName) {
    var isNode = !!object.nodeName;
    return isNode && this.propertyHasEvents[hasEventsKey(object.nodeName, fieldName)];
  }
  addWatch(object, fieldName, watch) {
    var self = this;
    var isNode = !!object.nodeName;
    if (isNode && isNodeDomApi(object, fieldName)) {
      throw new Error('The native property '+fieldName+' on node '+object.nodeName+' cannot be observed');
    }
    var watchCount = super(object, fieldName, watch);
    if (watchCount === 1 && object.nodeName) {
      var events = this.nodeNameEvents[object.nodeName.toLowerCase()] || [];
      events.forEach((event) => {
        object.addEventListener(event, this.eventListener, false);
      });
      object.addEventListener('propchange', this.eventListener, false);
    }
  }
  removeWatch(object, fieldName, watch) {
    var watchCount = super(object, fieldName, watch);
    if (watchCount === 0 && object.nodeName) {
      var events = this.nodeNameEvents[object.nodeName.toLowerCase()];
      events.forEach((event) => {
        object.removeEventListener(event, this.eventListener);
      });
      object.removeEventListener('propchange', this.eventListener, false);
    }
  }
}

function hasEventsKey(nodeName, propertyName) {
  return nodeName.toUpperCase()+'.'+propertyName;
}

function isNodeDomApi(node, property) {
  if (node.nodeType === Node.TEXT_NODE && property === 'textContent') {
    return false;
  }
  var cache = isNodeDomApi.cache;
  if (!cache) {
    var propNames = Object.getOwnPropertyNames(document.createElement('span'));
    cache = {};
    propNames.forEach((propName) => {cache[propName] = true});
    isNodeDomApi.cache = cache;
  }
  return cache[property];
}
