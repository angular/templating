import {compile as traceur} from './traceur-api';
import {$, $html} from '../dom_mocks';
import {inject, use} from 'di/testing';
import {Precompile, serialize} from '../../src/compiler/precompiler';
import {SimpleNodeContainer} from '../../src/node_container';
import {ModuleLoader} from '../../src/module_loader';
import {BrowserDocumentLoader} from '../../src/compiler/browser_document_loader';

describe('precompile', ()=>{

  function evalES6Module(sourceES6, done) {
    var transpiled = traceur(sourceES6, {
      modules: 'amd'
    });
    if (transpiled.errors.length) {
      // TODO(vojta): this promise-land eats exceptions, fix that
      throw new Error('in lines:\n'+sourceES6+'\n'+transpiled.errors);
    }
    var sourceES5 = transpiled.js;
    sourceES5 = sourceES5.replace(/"templating"/g, '"src/index"');

    var define = function(deps, callback) {
      inject(ModuleLoader, (moduleLoader)=>{
        moduleLoader(deps).then(function(depModules) {
          var module = callback(...depModules);
          done(module);
        });
      });
    }
    eval(sourceES5);
  }

  describe('precompile', ()=>{

    // TODO: Add more unit tests...

    // TODO: check the error handling, as it does not report errors right now.
    // -> integrate with diary.js?

    it('should work in integration', (done) => {
      use(BrowserDocumentLoader);

      inject(Precompile, (precompile) => {
        // Fetch the template with RequireJS, using the compile_ng_template plugin.
        requirejs(['compile_ng_template!test/compiler/atemplate'], function(requireMod) {
          requireMod.promise.then(function(mod) {
            expect(mod.viewFactory.templateContainer.innerHTML.trim())
                  .toBe('<module src="./amodule"></module>\n\n<div>someTemplate</div>');

            // Let's serialize into ES6, transpile with Traceur into ES5, and evaluate ;-)
            var es6Source = precompile(null, mod.viewFactory, mod.modules);
            evalES6Module(es6Source, function(requireMod) {
              requireMod.promise.then(function(mod) {
                expect(mod.viewFactory.templateContainer.innerHTML.trim())
                  .toBe('<module src="./amodule"></module>\n\n<div>someTemplate</div>');
                done();
              });
            });
          }, function(e) {
            console.log(e.stack);
          });
        });
      });
    });
  });

  describe('serialize', ()=>{

    function serializeAndEval(object, moduleNamesWithExports, done) {
      evalES6Module(serialize(object, 'data', moduleNamesWithExports), function(module) {
        module.data.then(done, function(e) {
          dump(e.stack)
        });
      });
    }

    it('should serialize an object', (done) =>{
      var input = {a:1, b:null, c:undefined};
      serializeAndEval(input, [], function(result) {
        expect(result).toEqual({a:1, b:null, c:undefined});
        done();
      });
    });

    it('should serialize an array', (done) =>{
      var input = [1,2];
      serializeAndEval(input, [], function(result) {
        expect(result).toEqual(input);
        done();
      });
    });

    it('should serialize a Date', (done) =>{
      var input = new Date();
      serializeAndEval(input, [], function(result) {
        expect(result).toEqual(input);
        done();
      });
    });

    it('should serialize a Regex', (done) =>{
      var input = /a/;
      serializeAndEval(input, [], function(result) {
        expect(result).toEqual(input);
        done();
      });
    });

    it('should serialize a class of a module as a static import', (done) =>{
      var input = new TestClass1();
      input.a = 1;
      serializeAndEval(input, [{
        module: 'test/compiler/precompiler.spec',
        name: 'TestClass1',
        type: TestClass1,
        dynamic: false,
      }], function(result) {
        expect(result instanceof TestClass1).toBe(true);
        expect(result.a).toEqual(1);
        done();
      });
    });

    it('should serialize a class of a module as a dynamic import', (done) =>{
      var input = new TestClass1();
      input.a = 1;
      serializeAndEval(input, [{
        module: 'test/compiler/precompiler.spec',
        name: 'TestClass1',
        type: TestClass1,
        dynamic: true
      }], function(result) {
        expect(result instanceof TestClass1).toBe(true);
        expect(result.a).toEqual(1);
        done();
      });
    });

    it('should not serialize properties of prototypes', (done) =>{
      TestClass1.prototype.b = 'test';
      var input = new TestClass1();
      serializeAndEval(input, [{
        module: 'test/compiler/precompiler.spec',
        name: 'TestClass1',
        type: TestClass1,
        dynamic: false
      }], function(result) {
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
      serializeAndEval(input, [{
        module: 'test/compiler/precompiler.spec',
        name: 'TestClass1',
        type: TestClass1,
        dynamic: false
      }], function(result) {
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
      serializeAndEval(input, [], function(result) {
        expect(result.innerHTML).toBe('someContent');
        expect(result.nodeName).toBe('DIV');
        done();
      });
    });

    it('should serialize a text node', (done) =>{
      var text = document.createTextNode('someText');
      serializeAndEval(text, [], function(result) {
        expect(result.nodeValue).toBe('someText');
        expect(result.nodeName).toBe('#text');
        done();
      });
    });

    it('should serialize a document fragment', (done) =>{
      var df = document.createDocumentFragment();
      var el = document.createElement('div');
      df.appendChild(el);
      serializeAndEval(df, [], function(result) {
        expect(result.nodeName).toBe('#document-fragment');
        expect(result.childNodes[0].nodeName).toBe('DIV');
        done();
      });
    });

    it('should serialize a SimpleNodeContainer', (done) =>{
      var nc = new SimpleNodeContainer([document.createElement('div')]);
      serializeAndEval(nc, [{
        module: 'templating',
        name: 'SimpleNodeContainer',
        type: SimpleNodeContainer,
        dynamic: true
      }], function(result) {
        expect(result instanceof SimpleNodeContainer).toBe(true);
        expect(result.childNodes[0].nodeName).toBe('DIV');
        done();
      });
    });
  });

});


export class TestClass1 {
}
