import {use, inject} form 'di/testing';
import {DocumentLoader} from '../../src/compiler/document_loader';
import {ModuleLoader} from '../../src/module_loader';
import {TemplateLoader} from '../../src/compiler/template_loader';
import {ViewFactory} from '../../src/view_factory';

describe('TemplateLoader', ()=>{
  var moduleLoader;
  var documentLoader;

  beforeEach(()=>{
    moduleLoader = jasmine.createSpy('moduleLoader');
    documentLoader = jasmine.createSpy('documentLoader');
    use(function() {
      return moduleLoader;
    }).as(ModuleLoader);
    use(function() {
      return documentLoader;
    }).as(DocumentLoader);
  });

  describe('url template', ()=>{

    function simulate(modules, templateUrl, templateHtml, done) {
      moduleLoader.and.callFake(function(moduleNames) {
        return Promise.resolve(
          moduleNames.filter((moduleName) => {
            return !!modules[moduleName];
          }).map((moduleName) => {
            return modules[moduleName];
          })
        );
      });
      var doc = document.implementation.createHTMLDocument();
      doc.open();
      doc.write(templateHtml);
      doc.close();
      documentLoader.and.returnValue(Promise.resolve(doc));
      inject(TemplateLoader, (templateLoader)=>{
        templateLoader(templateUrl).then(done);
      });
    }

    it('should return a viewFactory with the correct templateContainer', (done)=>{
      simulate(
        {},
        'someUrl.html',
        'someHtml',
        function(data) {
          expect(data.viewFactory instanceof ViewFactory).toBe(true);
          expect(data.viewFactory.templateContainer.innerHTML)
            .toBe('someHtml');
          done();
        }
      );
    });

    it('should return a viewFactory with only <body> children moved into a <div>', (done)=>{
      simulate(
        {},
        'someUrl.html',
        '<html><body>someHtml</body></html>',
        function(data) {
          expect(data.viewFactory instanceof ViewFactory).toBe(true);
          expect(data.viewFactory.templateContainer.outerHTML)
            .toBe('<div>someHtml</div>');
          done();
        }
      );
    });

    it('should return a promise that returns the modules', (done)=>{
      var modules = {
        someModuleA: {},
        someModuleB: {}
      };
      simulate(
        modules,
        'someUrl.html',
        '<module src="someModuleA"></module><module src="someModuleB"></module>',
        function(data) {
          expect(data.modules.someModuleA).toBe(modules.someModuleA);
          expect(data.modules.someModuleB).toBe(modules.someModuleB);
          done();
        }
      );
    });

    it('should load modules with relative paths relative to the template path', (done)=>{
      simulate(
        {'some/someModuleA': {}},
        'some/url.html',
        '<module src="./someModuleA"></module>someHtml',
        function(data) {
          expect(data.modules['some/someModuleA']).toBeTruthy();
          done();
        }
      );
    });

    it('should load modules with relative paths relative to the template path without slash', (done)=>{
      simulate(
        {'./someModuleA': {}},
        'someUrl.html',
        '<module src="./someModuleA"></module>someHtml',
        function(data) {
          expect(data.modules['./someModuleA']).toBeTruthy();
          done();
        }
      );
    });

    it('should load modules with non relative paths independent of the template path', (done)=>{
      simulate(
        {'someModuleA': {}},
        'someUrl.html',
        '<module src="someModuleA"></module>someHtml',
        function(data) {
          expect(data.modules['someModuleA']).toBeTruthy();
          done();
        }
      );
    });

  });

  describe('require "document.html"', ()=>{

    // TODO

  });

});
