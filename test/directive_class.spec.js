import {use, inject} from 'di/testing';
import {DirectiveClass} from '../src/directive_class';
import {DecoratorDirective} from '../src/annotations';
import {DirectiveClassSet} from '../src/directive_class_set';

describe('DirectiveClass', ()=>{
  it('should be instantiable', ()=>{
    class TestDirective {}
    new DirectiveClass(new DecoratorDirective({selector:'test'}), TestDirective);
  });
});

describe('DirectiveClassSet', ()=> {
  it('should be instantiable', ()=> {
    new DirectiveClassSet(null, []);
  });
});
