import {load as htmlLoad} from '../src/requirejs-html';
import {viewFactory} from '../src/requirejs-html!./atemplate';
import {ViewFactory} from '../src/view_factory';

describe('requirejs-html', ()=>{
  var req, load, xhr, oldXhr;
  beforeEach(()=>{
    req = jasmine.createSpy('req');
    req.toUrl = jasmine.createSpy('toUrl');
    load = jasmine.createSpy('load');
    load.error = jasmine.createSpy('load.error');
    xhr = {
      open: jasmine.createSpy('open'),
      send: jasmine.createSpy('send')
    };
    oldXhr = window.XMLHttpRequest;
    window.XMLHttpRequest = jasmine.createSpy('xhr').and.returnValue(xhr);
  });
  
  afterEach(()=>{
    window.XMLHttpRequest = oldXhr;
  });

  function returnXhrSuccess(html) {
    if (xhr.responseType === 'document') {
      var doc = {};
      doc.body = document.createElement('div');
      doc.body.innerHTML = html;
      xhr.responseXML = doc;
    } else if (xhr.responseType === 'text/html') {
      xhr.responseText = html;
    } else {
      throw new Error('unknown response type: ' + xhr.responseType);
    }

    xhr.readyState = 4;
    xhr.status = 200;
    xhr.onreadystatechange();
  }

  it('should normalize the url and load the template via xhr', ()=>{
    req.toUrl.and.returnValue('someNormalizedName');
    
    htmlLoad('someName', req, load);

    expect(req.toUrl).toHaveBeenCalledWith('someName.html');
    expect(xhr.open).toHaveBeenCalledWith('GET', 'someNormalizedName', true);
    expect(xhr.send).toHaveBeenCalled();
  });

  it('should return a promise that returns a viewFactory', (done)=>{
    req.toUrl.and.returnValue('someNormalizedName');
    req.and.callFake(function(deps, callback) {
      callback();
    });

    htmlLoad('someName', req, load);
    expect(load).toHaveBeenCalled();
    expect(load.error).not.toHaveBeenCalled();
    var promise = load.calls.mostRecent().args[0].viewFactory;
    expect(promise.then).toBeDefined();

    returnXhrSuccess('someHtml');
    promise.then((vf)=>{
      expect(vf instanceof ViewFactory).toBe(true);
      done();
    });
  });  

  it('should load the template body if responseType=document is supported', (done)=>{
    req.toUrl.and.returnValue('someNormalizedName');
    req.and.callFake(function(deps, callback) {
      callback();
    });

    htmlLoad.responseTypeContentSupported = true;
    htmlLoad('someName', req, load);
    var promise = load.calls.mostRecent().args[0].viewFactory;
    expect(xhr.responseType).toBe('document');

    returnXhrSuccess('someHtml');
    promise.then((vf)=>{
      expect(vf.templateContainer.innerHTML).toBe('someHtml');
      done();
    });
  });

  it('should load the template if responseType=document is not supported', ()=>{
    req.toUrl.and.returnValue('someNormalizedName');
    req.and.callFake(function(deps, callback) {
      callback();
    });

    htmlLoad.responseTypeContentSupported = false;
    htmlLoad('someName', req, load);
    var promise = load.calls.mostRecent().args[0].viewFactory;
    expect(xhr.responseType).toBe('text/html');
    
    returnXhrSuccess('someHtml');
    promise.then((vf)=>{
      expect(vf.templateContainer.innerHTML).toBe('someHtml');
      done();
    });
  });

  // TODO: it should load the modules defines in the <module> tags

  describe('errors', ()=>{
    
    it('should detect xhr aborts via onerror', (done)=>{
      req.toUrl.and.returnValue('someNormalizedName');

      htmlLoad('someName', req, load);
      xhr.onerror();
      var promise = load.calls.mostRecent().args[0].viewFactory;
      promise.catch((e) => {
        expect(e).toEqual(new Error('Error loading someNormalizedName: aborted'));        
        done();
      });
    });

    it('should detect xhr aborts via onabort', ()=>{
      req.toUrl.and.returnValue('someNormalizedName');

      htmlLoad('someName', req, load);
      xhr.onabort();
      var promise = load.calls.mostRecent().args[0].viewFactory;
      promise.catch((e) => {
        expect(e).toEqual(new Error('Error loading someNormalizedName: aborted'));
        done();
      });
    });

    it('should detect error status codes', ()=>{
      req.toUrl.and.returnValue('someNormalizedName');

      htmlLoad('someName', req, load);
      xhr.readyState = 4;
      xhr.status = 404;
      xhr.statusText = 'NotFound';
      xhr.onreadystatechange();
      var promise = load.calls.mostRecent().args[0].viewFactory;
      promise.catch((e) => {
        expect(e).toEqual(new Error('Error loading someNormalizedName: 404 NotFound'));
        done();
      });
    });
  });
  
  it('should work in integration', (done)=>{
    viewFactory.then((vf) =>{
      expect(vf.templateContainer.innerHTML.trim()).toBe('<div>someTemplate</div>');
      done();
    });
  });

});
