import {ArrayLikeOfNodes} from './types';
import {ArrayOfElementBinder} from './types';
import {View} from './view';
import {Injector} from 'di/injector';

/*
 * A ViewFactory contains a nodes which need to be cloned for each new 
 * instance of a view. It also contains a list of ElementBinders 
 * which need to be bound to the cloned instances of the view. 
 */
export class ViewFactory {  
  /**
   * @param templateNodes nodes of the template. 
   *        All elements in those nodes and their child nodes that should be bound have to have
   *        the css class `ng-directive`.
   * @param elementBinders Array of elementBinders for the nodes with the css class `ng-directive`
   *        from `templateNodes` in depth first order.
   */  
  constructor(templateNodes:ArrayLikeOfNodes, elementBinders:ArrayOfElementBinder) {
    this.templateNodes = templateNodes;
    this.elementBinders = elementBinders;
  }
  createView(injector:Injector) {
    // TODO: Use a documentFragement internally
    // TODO: clone the nodes
    // TODO: bind the element binders
    var clonedNodes = [];
    for (var i=0, ii=this.templateNodes.length; i<ii; i++) {
      clonedNodes.push(this.templateNodes[i].cloneNode(true));
    }
    return new View(clonedNodes);
  }
}
