import {NodeAttrs} from './types';
import {Inject} from 'di/annotations';

/**
 * This will be created once for every view instance.
 */
export class EventHandler {
  @Inject('executionContext')
  constructor(executionContext) {
    this.executionContext = executionContext;
  }

  listen(node:Node, eventName:string, expression:string) {
    // TODO
  }
}
