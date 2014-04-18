import {Injector, Inject, Provide} from 'di';
import {TemplateLoader} from '../loader/template_loader';
import {DocumentLoader} from '../loader/document_loader';
import {Global} from '../global';
import fs from 'fs';
import jsdom from 'jsdom'

@Provide(Global)
function nodeGlobal() {
  return {
    // TODO(vojta): can we get rid off this?
    Promise: global.Promise,
    require: global.requirejs,
    document: global.document
  };
}

@Provide(DocumentLoader)
function nodeDocumentLoader() {
  return function(url) {

    // JS files need to be required from temp/examples (transpiled code),
    // but not HTML files ;-)
    // TODO(vojta): remove
    url = url.replace('temp/examples', 'examples');

    return new global.Promise(function(resolve, reject) {
      fs.readFile(url, function(err, data) {
        if (err) {
          return reject(err);
        }

        // TODO(vojta): for some reason jsdom.jsdom does not produce correct DOM
        // (querySelectorAll fails), probably different version of DOM.
        jsdom.env({
          html: data.toString(),
          done: function(errors, window) {
            resolve(window.document);
          }
        });
      });
    });
  };
}

@Inject(TemplateLoader)
function HtmlPlugin(templateLoader) {

  return function htmlPlugin(name, req, onload, reqConfig) {
    var promise = templateLoader(req.toUrl(name + '.html'), name, true);

    onload({
      __esModule: true,
      promise: promise
    });
  }
}


export function load(name, req, onload, reqConfig) {
  var injector = reqConfig.htmlPluginInjector;

  if (!injector) {
    injector = new Injector([nodeGlobal, nodeDocumentLoader]);
    reqConfig.htmlPluginInjector = injector;
  }

  return injector.get(HtmlPlugin)(name, req, onload, reqConfig);
}
