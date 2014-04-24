import {inject, use} from 'di/testing';
import {BrowserDocumentLoader} form '../../src/loader/browser_document_loader';
import {Global} from '../../src/global';
import {$html} form '../dom_mocks';

describe('BrowserDocumentLoader', ()=>{
  var xhr, global;
  beforeEach(()=>{
    xhr = {
      open: jasmine.createSpy('open'),
      send: jasmine.createSpy('send'),
      _responseTypeDocumentSupported: true
    };
    Object.defineProperty(xhr, 'responseType', {
      get: function() { return this._responseType; },
      set: function(value) {
        if (xhr._responseTypeDocumentSupported &&
            value === 'document' &&
            !xhr.open.calls.mostRecent().args[2]) {
          throw new Error('resonseType document is not supported for sync calls');
        }
        this._responseType = value;
      }
    });
    global = {
      XMLHttpRequest: function() {
        return xhr;
      },
      document: {
        createElement: document.createElement.bind(document),
        implementation: document.implementation
      },
      location: {
        pathname: ''
      },
      Promise: window.Promise
    };
    use(global).as(Global);
  });

  function returnXhrResposeXML(html) {
    expect(xhr.responseType).toBe('document');
    var doc = document.implementation.createHTMLDocument();
    doc.open();
    doc.write(html);
    doc.close();
    xhr.responseXML = doc;

    xhr.readyState = 4;
    xhr.status = 200;
    xhr.onreadystatechange();
  }

  it('should throw if responseType=document is not supported', ()=>{
    xhr._responseTypeDocumentSupported = false;
    try {
      inject(BrowserDocumentLoader, ()=>{});
    } catch (e) {
      expect(e.toString().indexOf('This browser does not support responseType="document"')!==-1);
    }
  });

  it('should return window.document if the given url resolves to '+
    'location.pathname', (done)=>{
    global.location.pathname = '/some.html';

    inject(BrowserDocumentLoader, (documentLoader)=>{
      var promise = documentLoader('/some.html');
      promise.then(function(doc) {
        expect(doc).toBe(global.document);
        done();
      });
    });
  });

  it('should create a GET xhr with the given url', ()=>{
    inject(BrowserDocumentLoader, (documentLoader)=>{
      var promise = documentLoader('someUrl');
      expect(xhr.open).toHaveBeenCalledWith('GET', 'someUrl', true);
      expect(xhr.send).toHaveBeenCalled();
    });
  });

  it('should return an html fragment '+
      'if responseType=document is supported', (done)=>{
    inject(BrowserDocumentLoader, (documentLoader)=>{
      var promise = documentLoader('someUrl');
      expect(xhr.responseType).toBe('document');
      returnXhrResposeXML('a<b>c</b>');
      promise.then(function(doc) {
        expect($html(doc.documentElement)).toBe('<html><head></head><body>a<b>c</b></body></html>');
        done();
      });
    });
  });

  it('should return the an html document '+
      'if responseType=document is supported', (done)=>{
    inject(BrowserDocumentLoader, (documentLoader)=>{
      var promise = documentLoader('someUrl');
      expect(xhr.responseType).toBe('document');
      returnXhrResposeXML('<html><body>a<b>c</b></body></html>');
      promise.then(function(doc) {
        expect($html(doc.documentElement)).toBe('<html><head></head><body>a<b>c</b></body></html>');
        done();
      });
    });
  });

  describe('errors', ()=>{

    it('should detect xhr aborts via onerror', (done)=>{
      inject(BrowserDocumentLoader, (documentLoader)=>{
        var promise = documentLoader('someUrl');
        xhr.onerror();
        promise.catch((e) => {
          expect(e).toEqual(new Error('Error loading someUrl: aborted'));
          done();
        });
      });
    });

    it('should detect xhr aborts via onabort', ()=>{
      inject(BrowserDocumentLoader, (documentLoader)=>{
        var promise = documentLoader('someUrl');
        xhr.onabort();
        promise.catch((e) => {
          expect(e).toEqual(new Error('Error loading someUrl: aborted'));
          done();
        });
      });
    });

    it('should detect error status codes', ()=>{
      inject(BrowserDocumentLoader, (documentLoader)=>{
        var promise = documentLoader('someUrl');
        xhr.readyState = 4;
        xhr.status = 404;
        xhr.statusText = 'NotFound';
        xhr.onreadystatechange();
        promise.catch((e) => {
          expect(e).toEqual(new Error('Error loading someUrl: 404 NotFound'));
          done();
        });
      });
    });
  });

});
