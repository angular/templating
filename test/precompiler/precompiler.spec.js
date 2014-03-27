import {compile as traceur} from './traceur-api';
import {$, $html} from '../dom_mocks';
import {Injector} from 'di/injector';
import {precompile, serialize} from '../../src/precompiler';
import {SimpleNodeContainer} from '../../src/node_container';
import {DecoratorDirective} from '../../src/annotations';

describe('precompile', ()=>{

  function evalES6Module(sourceES6, done) {
    var transpiled = traceur(sourceES6, {
      modules: 'amd'
    });
    if (transpiled.errors.length) {
      throw new Error('in lines:\n'+sourceES6+'\n'+transpiled.errors);
    }
    var sourceES5 = transpiled.js;
    sourceES5 = sourceES5.replace(/templating\//g, 'src/');

    var define = function(deps, callback) {      
      // TODO: Use the ES6 loader here!
      require(deps, function() {
        var module = callback(...arguments);
        done(module);        
      });
    }
    eval(sourceES5);    
  }

  describe('compile html into a viewFactory', ()=>{

    it('should compile an empty template', (done)=>{
      precompile({}, require, '<div></div>').then((sourceES6)=>{
        evalES6Module(sourceES6, function(module) {
          var rootInjector = new Injector();
          var view = module.viewFactory.createRootView(rootInjector, {});
          expect($html(view.nodes)).toBe('<div></div>');

          done();
        });
      });
    });

    it('should compile a template that contains bindings', (done)=>{
      precompile({}, require, '<div bind-value="test"></div>').then((sourceES6)=>{
        evalES6Module(sourceES6, function(module) {
          var vf = module.viewFactory;
          var rootInjector = new Injector();
          var view = vf.createRootView(rootInjector, {});
          expect($html(view.nodes)).toBe('<div bind-value="test" class="ng-binder"></div>');
          expect(vf.elementBinders.length).toBe(2);
          expect(vf.elementBinders[1].attrs.bind).toEqual({'value':'test'});

          done();
        });
      });
    });

    // TODO: it should compile a template that contains directives
    // -> needs to use the <module> tag there!

  });

  describe('serialize', ()=>{

    function serializeAndEval(object, moduleNamesWithExports, done) {
      evalES6Module(serialize(object, 'data', moduleNamesWithExports), function(module) {
        done(module.data);
      });
    }

    it('should serialize an object', (done) =>{
      var input = {a:1, b:null, c:undefined};
      serializeAndEval(input, {}, function(result) {
        expect(result).toEqual({a:1, b:null, c:undefined});
        done();
      });
    });

    it('should serialize an array', (done) =>{
      var input = [1,2];
      serializeAndEval(input, {}, function(result) {
        expect(result).toEqual(input);
        done();
      });
    });

    it('should serialize a Date', (done) =>{
      var input = new Date();
      serializeAndEval(input, {}, function(result) {
        expect(result).toEqual(input);
        done();
      });
    });

    it('should serialize a Regex', (done) =>{
      var input = /a/;
      serializeAndEval(input, {}, function(result) {
        expect(result).toEqual(input);
        done();
      });
    });

    it('should serialize a class of a module', (done) =>{
      var input = new TestClass1();
      input.a = 1;
      serializeAndEval(input, {'test/precompiler/precompiler.spec': {'TestClass1': TestClass1}}, function(result) {
        expect(result instanceof TestClass1).toBe(true);
        expect(result.a).toEqual(1);
        done();
      });
    });

    it('should not serialize properties of prototypes', (done) =>{
      TestClass1.prototype.b = 'test';
      var input = new TestClass1();
      serializeAndEval(input, {'test/precompiler/precompiler.spec': {'TestClass1': TestClass1}}, function(result) {
        
        expect(result instanceof TestClass1).toBe(true);

        expect(result.b).toBe('test');
        delete TestClass1.prototype.b;
        expect(result.b).toBeUndefined();
        
        done();
      });
    });

    it('should serialize nested structures', (done) =>{
      var input = new TestClass1();
      input.a = 1;
      input.b = new TestClass1();
      input.b.c = 2;
      serializeAndEval(input, {'test/precompiler/precompiler.spec': {'TestClass1': TestClass1}}, function(result) {
        expect(result instanceof TestClass1).toBe(true);
        expect(result.a).toEqual(1);
        expect(result.b instanceof TestClass1).toBe(true);
        expect(result.b.c).toEqual(2);
        done();
      });
    });

    it('should serialize an element', (done) =>{
      var input = document.createElement('div');
      input.innerHTML = 'someContent';
      serializeAndEval(input, {}, function(result) {
        expect(result.innerHTML).toBe('someContent');
        expect(result.nodeName).toBe('DIV');
        done();
      });
    });

    it('should serialize a text node', (done) =>{
      var text = document.createTextNode('someText');
      serializeAndEval(text, {}, function(result) {
        expect(result.nodeValue).toBe('someText');
        expect(result.nodeName).toBe('#text');
        done();
      });
    });

    it('should serialize a document fragment', (done) =>{
      var df = document.createDocumentFragment();
      var el = document.createElement('div');
      df.appendChild(el);
      serializeAndEval(df, {}, function(result) {
        expect(result.nodeName).toBe('#document-fragment');
        expect(result.childNodes[0].nodeName).toBe('DIV');
        done();
      });
    });

    it('should serialize a SimpleNodeContainer', (done) =>{
      var nc = new SimpleNodeContainer([document.createElement('div')]);
      serializeAndEval(nc, {'templating/node_container': {'SimpleNodeContainer': SimpleNodeContainer}}, function(result) {
        expect(result instanceof SimpleNodeContainer).toBe(true);
        expect(result.childNodes[0].nodeName).toBe('DIV');
        done();
      });
    });    
  });

});


export class TestClass1 {
}
