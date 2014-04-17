import {compile as traceur} from './traceur-api';
import {$, $html} from '../dom_mocks';
import {inject, use} from 'di/testing';
import {Precompile} from '../../src/loader/precompiler';
import {SimpleNodeContainer} from '../../src/util/simple_node_container';
import {ModuleLoader} from '../../src/util/module_loader';
import {Compiler} from '../../src/compiler/compiler';

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

    var define = require = function(deps, callback) {
      inject(ModuleLoader, (moduleLoader)=>{
        moduleLoader(deps).then(function(depModules) {
          var module = callback(...depModules);
          done(module);
        });
      });
    }
    eval(sourceES5);
  }

  function precompileAndEval(appTemplates, template, modules, done) {
    var es6Source;
    inject(Precompile, (precompile) =>{
      es6Source = precompile(appTemplates, template, modules);
    });
    evalES6Module(es6Source, function(requireMod) {
      requireMod.promise.then(function(data) {
        done(data);
      });
    });
  }

  describe('precompile', ()=>{
    var moduleLoader, modules;
    beforeEach(()=>{
      moduleLoader = jasmine.createSpy('moduleLoader');
      modules = {};
      moduleLoader.and.callFake(function(moduleNames) {
        return Promise.resolve(
          moduleNames.filter((moduleName) => {
            return !!modules[moduleName];
          }).map((moduleName) => {
            return modules[moduleName];
          })
        );
      });
      use(function() {
        return moduleLoader;
      }).as(ModuleLoader);
    });

    it('should precompile an empty template', (done) =>{
      precompileAndEval(null, {}, modules, function(result) {
        expect(result.template).toEqual({});
        done();
      });
    });

    it('should precompile a template with an element as container', (done) =>{
      var containerHtml = '<div>a</div>';
      var template = {
        container: $(containerHtml)[0]
      };
      precompileAndEval(null, template, modules, function(result) {
        expect(result.template.container.outerHTML).toBe(containerHtml);
        done();
      });
    });

    it('should precompile a template with a SimpleNodeContainer', (done) =>{
      var innerHTML = 'a<b></b>c';
      var simpleContainer = new SimpleNodeContainer($(innerHTML));
      var template = {
        container: simpleContainer
      };
      precompileAndEval(null, template, modules, function(result) {
        expect(result.template.container.innerHTML).toBe(innerHTML);
        done();
      });
    });

    it('should precompile a template with a document fragment', (done) =>{
      var fragment = document.createDocumentFragment();
      var innerHTML = 'a<b></b>c';
      var nodes = Array.prototype.slice.call($(innerHTML));
      nodes.forEach((node)=>{fragment.appendChild(node)});
      var template = {
        container: fragment
      };
      precompileAndEval(null, template, modules, function(result) {
        expect(result.template.container.innerHTML).toBe(innerHTML);
        done();
      });
    });

    it('should precompile a template with binders', (done)=>{
      var containerHtml = '<div>a</div>';
      var template = {
        container: $(containerHtml)[0],
        binders: [{
            attrs: {
              init: { a:1 },
              bind: { b:'2' },
              event: { c:'3' }
            }
          }]
      };
      precompileAndEval(null, template, modules, function(result) {
        expect(result.template.binders).toEqual(template.binders);
        done();
      });

    });

    it('should precompile a directive reference', (done)=>{
      class SomeDecorator { }

      modules['somePath'] = {someExprt: SomeDecorator};
      var containerHtml = '<div>a</div>';
      var template = {
        container: $(containerHtml)[0],
        binders: [{
          decorators: [SomeDecorator]
        }]
      };

      precompileAndEval(null, template, modules, function(result) {
        expect(result.template.binders).toEqual(template.binders);
        done();
      });
    });

    it('should precompile app templates', (done) =>{
      var appTemplates = [{a:1}];
      precompileAndEval(appTemplates, null, modules, function(result) {
        expect(result.appTemplates).toEqual(appTemplates);
        done();
      });
    });


  });

});
