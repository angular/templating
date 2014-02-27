import {ArrayLikeOfNodes} from './types';

/*
 * A ViewFactory contains a nodes which need to be cloned for each new 
 * instance of a view. It also contains a list of ElementBinders 
 * which need to be bound to the cloned instances of the view. 
 */
export class ViewFactory {
  constructor(elements:ArrayLikeOfNodes) {
    this.elements = elements;
  }
  create() {
    return new View(this.elements);
  }
}
