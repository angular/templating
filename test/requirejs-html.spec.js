import {load as htmlLoad} from '../src/requirejs-html';
import {viewFactory} from '../src/requirejs-html!./atemplate';


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
      var doc = document.createElement('div');
      doc.innerHTML = html;
      xhr.responseXML = doc;
    } else if (xhr.responseType === 'text/html') {
      xhr.responseText = html;
    } else {
      throw new Error('unknown response type: ' + xhr.responseType);
    }

    xhr.readyState = 4;
    xhr.status = 200;
    xhr.onreadystatechange();
    return doc;
  }

  it('should normalize the url', ()=>{
    req.toUrl.and.returnValue('someNormalizedName');
    
    htmlLoad('someName', req, load);

    expect(req.toUrl).toHaveBeenCalledWith('someName.html');
    expect(xhr.open).toHaveBeenCalledWith('GET', 'someNormalizedName', true);
  });

  it('should load the template via xhr and create a ViewFactory if responseType=document is supported', ()=>{
    req.toUrl.and.returnValue('someNormalizedName');

    htmlLoad.responseTypeContentSupported = true;
    htmlLoad('someName', req, load);

    expect(xhr.open).toHaveBeenCalledWith('GET', 'someNormalizedName', true);
    expect(xhr.send).toHaveBeenCalled();

    expect(xhr.responseType).toBe('document');
    var doc = returnXhrSuccess('someHtml');

    expect(load).toHaveBeenCalled();
    expect(load.error).not.toHaveBeenCalled();
    var vf = load.calls.mostRecent().args[0].viewFactory;
    expect(vf.templateContainer).toBe(doc);
  });

  it('should load the template via xhr and create a ViewFactory if responseType=document is not supported', ()=>{
    req.toUrl.and.returnValue('someNormalizedName');

    htmlLoad.responseTypeContentSupported = false;
    htmlLoad('someName', req, load);

    expect(xhr.open).toHaveBeenCalledWith('GET', 'someNormalizedName', true);
    expect(xhr.send).toHaveBeenCalled();

    expect(xhr.responseType).toBe('text/html');
    returnXhrSuccess('someHtml');

    expect(load).toHaveBeenCalled();
    expect(load.error).not.toHaveBeenCalled();
    var vf = load.calls.mostRecent().args[0].viewFactory;
    expect(vf.templateContainer.innerHTML).toBe('someHtml');
  });

  describe('errors', ()=>{
    
    it('should detect xhr aborts vian onerror', ()=>{
      req.toUrl.and.returnValue('someNormalizedName');

      htmlLoad('someName', req, load);
      xhr.onerror();
      expect(load.error).toHaveBeenCalledWith(new Error('Error loading someNormalizedName: aborted'));
    });

    it('should detect xhr aborts via onabort', ()=>{
      req.toUrl.and.returnValue('someNormalizedName');

      htmlLoad('someName', req, load);
      xhr.onabort();
      expect(load.error).toHaveBeenCalledWith(new Error('Error loading someNormalizedName: aborted'));
    });

    it('should detect error status codes', ()=>{
      req.toUrl.and.returnValue('someNormalizedName');

      htmlLoad('someName', req, load);
      xhr.readyState = 4;
      xhr.status = 404;
      xhr.statusText = 'NotFound';
      xhr.onreadystatechange();
      expect(load.error).toHaveBeenCalledWith(new Error('Error loading someNormalizedName: 404 NotFound'));
    });
  });
  
  it('should work in integration', ()=>{
    // viewFactory
  });

});
