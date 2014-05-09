import {Inject} from 'di';

export var ChangeEventConfig = [
  {nodeName: 'input', events: ['input', 'keypress', 'change'], properties: ()=>['value', 'valueAsDate', 'valueAsNumber']},
  {nodeName: 'textarea', events: ['input', 'keypress', 'change'], properties: ()=>['value']},
  {nodeName: 'select', events: ['change'], properties: ()=>['value']},
  {nodeName: '*', events: ['propchange'], properties: (event) => event.properties}
];

export class EventHandler {
  @Inject(ChangeEventConfig)
  constructor(changeEventConfig) {
    this.defaultEvents = {};
    changeEventConfig.forEach((eventData) => {
      eventData.events.forEach((eventName) => {
        this._addDefaultEventHandler(eventName, eventData.nodeName, function(event, ngNode) {
          ngNode.refreshProperties(eventData.properties(event));
        });
      });
    });
  }
  _addDefaultEventHandler(eventName, nodeName, handler) {
    nodeName = nodeName.toLowerCase();
    var o1 = this.defaultEvents[eventName] = this.defaultEvents[eventName] || {};
    var o2 = o1[nodeName] = o1[nodeName] || [];
    o2.push(handler);
  }
  _findDefaultEventHandlers(eventName, nodeName) {
    nodeName = nodeName.toLowerCase();
    var o1 = this.defaultEvents[eventName];
    var o2 = [];
    if (o1) {
      o2 = o1[nodeName] || [];
    }
    return o2;
  }
  install(nodes, ngNodeEventNames) {
    var self = this;
    var elements = nodes.filter((node)=>{
      return node.nodeType === Node.ELEMENT_NODE;
    });
    elements.forEach((element)=>{
      var installedEventNames = {};
      ngNodeEventNames.forEach((eventName) => {
        installHandler(eventName, element, installedEventNames);
      });
      for (var eventName in this.defaultEvents) {
        installHandler(eventName, element, installedEventNames);
      }
    });

    function installHandler(eventName, topNode, usedEventNames) {
      if (usedEventNames[eventName]) {
        return;
      }
      usedEventNames[eventName] = true;
      topNode.addEventListener(eventName, function(event) {
        self._handleEvent(event, event.target, topNode);
      });
    }
  }
  _handleEvent(event, targetNode, topNode) {
    if (targetNode === null) {
      return;
    }
    var ngNode = targetNode.ngNode;
    var callHandlers = (handlers) => handlers.forEach((handler) => handler(event, ngNode));
    var handlers;
    if (ngNode) {
      if (ngNode.data && ngNode.data.events) {
        callHandlers(ngNode.data.events[event.type] || []);
      }
      callHandlers(this._findDefaultEventHandlers(event.type, '*'));
      callHandlers(this._findDefaultEventHandlers(event.type, targetNode.nodeName));
    }

    if (targetNode !== topNode) {
      this._handleEvent(event, targetNode.parentNode, topNode);
    }
  }
}
