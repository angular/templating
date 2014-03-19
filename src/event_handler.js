import {Inject} from 'di/annotations';
import {View} from './view';

/**
 * This will be created once for every view instance.
 */
export class EventHandler {
  @Inject(View)
  constructor(view) {
    this.view = view;
  }

  listen(node:Node, eventName:string, expression:string) {
    // TODO
  }
}
