import {Injector, Inject} from 'di'
import {TemplateLoader} from './template_loader';
import {BrowserDocumentLoader} form './browser_document_loader';

export function load(name, req, onload, reqConfig) {
  var injector = reqConfig.htmlPluginInjector;
  if (!injector) {
    // TODO: If run on server side, use a different DocumentLoader!
    injector = new Injector([BrowserDocumentLoader]);
    reqConfig.htmlPluginInjector = injector;
  }
  return injector.get(HtmlPlugin)(name, req, onload, reqConfig);
}

@Inject(TemplateLoader)
export function HtmlPlugin(templateLoader) {
  return htmlPlugin;

  function htmlPlugin(name, req, onload, reqConfig) {
    var promise = templateLoader(req.toUrl(name+'.html'), name);
    onload({
      __esModule: true,
      promise: promise
    });
  }
}