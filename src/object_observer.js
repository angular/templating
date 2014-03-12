import {Inject} from 'di/annotations';
import {ArrayOfObject} from './types';
import {EXECUTION_CONTEXT} from './annotations';

/**
 * This will be created once for every view instance.
 * TODO: Split into NodeBinder and ContextWatcher
 */
export class ObjectObserver {
  @Inject(EXECUTION_CONTEXT)
  constructor(executionContext) {
    this.executionContext = executionContext;
  }

  bindNode(expression:string, initValue:string, node:Node, directiveInstances:ArrayOfObject, propertyName:string) {
    // TODO
  }
}
