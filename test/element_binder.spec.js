import {DirectiveClass} from '../src/directive_class';
import {ElementBinder} from '../src/element_binder';
import {DecoratorDirective} from '../src/annotations';

describe('ElementBinder', ()=>{
  it('should be instantiable', ()=>{
    function Test() {}
    var dc = new DirectiveClass(new DecoratorDirective(), Test);
    new ElementBinder({
      decorators: [], 
      template: dc, 
      component: dc, 
      onEvents: [], 
      bindAttrs:[], 
      attrs:[]
    });
  });
});
