import {Inject, Provide} from 'di';
import {Global} from '../global';
import {DocumentLoader} from './document_loader';

@Inject(Global)
@Provide(DocumentLoader)
export function BrowserDocumentLoader(global) {
  var responseTypeContentSupported = calcResponseTypeContentSupported();

  return loadDocument;

  function loadDocument(url) {
    if (url === global.location.pathname) {
      return global.Promise.resolve(global.document);
    }

    return new global.Promise(resolver);

    function resolver(resolve, reject) {
      var done = false;
      var xhr = new global.XMLHttpRequest();
      xhr.open('GET', url, true);
      if (responseTypeContentSupported) {
        xhr.responseType = 'document';
      } else {
        xhr.responseType = 'text/html';
      }
      xhr.onreadystatechange = onreadystatechange;
      xhr.onabort = xhr.onerror = function() {
        if (!done) {
          done = true;
          reject(new Error('Error loading '+url+': aborted'), xhr);
        }
      }
      xhr.send();

      function onreadystatechange() {
        if (xhr.readyState === 4) {
          done = true;
          if (xhr.status !== 200) {
            reject(new Error('Error loading '+url+': '+xhr.status+' '+xhr.statusText), xhr);
          } else {
            var doc;
            if (xhr.responseXML) {
              doc = xhr.responseXML;
            } else {
              doc = global.document.implementation.createHTMLDocument();
              doc.open();
              doc.write(xhr.responseText);
              doc.close();
            }
            resolve(doc);
          }
        }
      }
    }
  }

  function calcResponseTypeContentSupported() {
    var req = new global.XMLHttpRequest();
    req.open('GET', '', false);
    try {
      req.responseType = 'document';
    } catch(e) {
      return false;
    }
    return true;
  }
}


