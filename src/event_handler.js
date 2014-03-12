import {Inject} from 'di/annotations';
import {EXECUTION_CONTEXT} from './annotations';

/**
 * This will be created once for every view instance.
 */
export class EventHandler {
  @Inject(EXECUTION_CONTEXT)
  constructor(executionContext) {
    this.executionContext = executionContext;
  }

  listen(node:Node, eventName:string, expression:string) {
    // TODO
  }
}
