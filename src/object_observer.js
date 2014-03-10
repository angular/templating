import {Inject} from 'di/annotations';
import {ArrayOfObject} from './types';

/**
 * This will be created once for every view instance.
 */
export class ObjectObserver {
  @Inject('executionContext')
  constructor(executionContext) {
    this.executionContext = executionContext;
  }

  watch(expression:string, changeCallback:Function) {
    // TODO
  }

  bindNode(expression:string, node:Node, directiveInstances:ArrayOfObject, propertyName:string) {
    // TODO
  }
}
