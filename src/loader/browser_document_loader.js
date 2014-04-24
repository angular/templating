import {Inject, Provide} from 'di';
import {Global} from '../global';
import {DocumentLoader} from './document_loader';

@Inject(Global)
@Provide(DocumentLoader)
export function BrowserDocumentLoader(global) {
  if (!calcResponseTypeContentSupported()) {
    throw new Error('This browser does not support responseType="document"');
  }

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
      xhr.responseType = 'document';
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
            resolve(xhr.responseXML);
          }
        }
      }
    }
  }

  function calcResponseTypeContentSupported() {
    var req = new global.XMLHttpRequest();
    // create a sync XHR
    req.open('GET', '', false);
    try {
      req.responseType = 'document';
    } catch(e) {
      // responseType=document can only be used with async XHRs.
      // Only browsers that support responseType=document check this
      // and will throw. Browser that don't support responseType=document
      // will ignore setting the value silently.
      return true;
    }
    return false;
  }
}


