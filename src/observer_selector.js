import { Inject } from 'di';

export function ChangeEventConfig() {
  return [
    {nodeName: 'input', events: ['input', 'change'], properties: ['value', 'valueAsDate', 'valueAsNumber']},
    {nodeName: 'textarea', events: ['input', 'change'], properties: ['value']},
    {nodeName: 'select', events: ['change'], properties: ['value']}
  ];
}

class NodeObserver{
  constructor(node, property, events){
    this.node = node;
    this.property = property;
    this.events = events;
    this.listener = ()=>{
      this.callback(node[property]);
    }
  }

  open(callback){
    this.callback = callback;

    this.events.forEach((event) => {
      this.node.addEventListener(event, this.listener, false);
    });

    this.node.addEventListener('propchange', this.listener, false);

    return this.node[this.property];
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
  @Inject(ChangeEventConfig)
  constructor(config) {
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
  }

  getObserver(obj, field){
    var isNode = !!obj.nodeName;

    if(isNode 
      && this.propertyHasEvents[hasEventsKey(obj.nodeName, field)] 
      && !isNodeDomApi(obj, field)){
      var events = this.nodeNameEvents[obj.nodeName.toLowerCase()];
      return new NodeObserver(obj, field, events);
    }

    return null;
  }
}

function hasEventsKey(nodeName, propertyName) {
  return nodeName.toUpperCase()+'.'+propertyName;
}

function isNodeDomApi(node, property) {
  if (node.nodeType === Node.TEXT_NODE && property === 'textContent') {
    return false;
  }
  if (property === 'hidden' || property === 'title') {
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
