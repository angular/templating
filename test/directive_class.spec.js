import {use, inject} from 'di/testing';
import {DirectiveClass} from '../src/directive_class';
import {DecoratorDirective} from '../src/annotations';

describe('DirectiveClass', ()=>{
  it('should be instantiable', ()=>{
    class TestDirective {}
    new DirectiveClass(new DecoratorDirective(), TestDirective);
  });
});
