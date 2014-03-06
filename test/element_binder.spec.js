import {DirectiveClass} from '../src/directive_class';
import {ElementBinder} from '../src/element_binder';
import {DecoratorDirective} from '../src/annotations';

describe('ElementBinder', ()=>{
  it('should be instantiable', ()=>{
    new ElementBinder({
      directives: [], 
      onEvents: [],
      bindAttrs:[], 
      attrs:[]
    });
  });
});
