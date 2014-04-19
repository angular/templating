import {Inject} from 'di';

export class EventHandler {
  install(nodes, events) {
    var self = this;
    var elements = nodes.filter((node)=>{
      return node.nodeType === Node.ELEMENT_NODE;
    });
    var eventNames = {
      propchange: true
    };
    // TODO: We only need the event names here!
    // TODO: index the events by name in the compiled data!
    events.forEach((events)=>{
      eventNames[events.event] = true;
    });
    elements.forEach((element)=>{
      for (var eventName in eventNames) {
        element.addEventListener(eventName, createHandler(eventName), false);
      }
    });

    function createHandler(eventName, topNode) {
      return function(event) {
        self._handleEvent(event, event.target, topNode);
      }
    }
  }
  _handleEvent(event, targetNode, topNode) {
    if (targetNode === null) {
      return;
    }
    var ngNode = targetNode.ngNode;
    var handeled = false;
    if (ngNode && ngNode.data && ngNode.data.events) {
      handeled = true;
      // TODO: ngNode.events should be indexed by eventName!
      ngNode.data.events.forEach((eventConfig)=>{
        if (eventConfig.event === event.type) {
          if (eventConfig.handler === 'onEvent') {
            // TODO: provide the event via locals
            ngNode.data.view.evaluate(eventConfig.expression);
          } else if (eventConfig.handler === 'directive') {
            // TODO: provide the event via locals
            ngNode.data.view.evaluate(
              eventConfig.expression,
              ngNode.data.injector.get(eventConfig.directive)
            );
          } else if (eventConfig.handler === 'refreshNode') {
            ngNode.refreshProperties(eventConfig.properties);
          }
        }
      });
    }
    if (event.type === 'propchange' && ngNode) {
      handeled = true;
      ngNode.refreshProperties(event.properties);
    }

    if (!handeled && targetNode!==topNode) {
      this._handleEvent(event, targetNode.parentNode, topNode);
    }
  }
}
