import {use, inject} from 'di/testing';
import {Compiler} from '../src/compiler';

describe('Compiler', ()=>{
  it('should be instantiable', ()=>{
    new Compiler();
  });
});
