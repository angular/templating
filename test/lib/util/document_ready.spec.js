import {inject, use} from 'di/testing';
import {DocumentReady} from '../../../src/lib/util/document_ready';
import {Global} from '../../../src/lib/util/global';

describe('DocumentReady', ()=>{
  var global;
  beforeEach(()=>{
    global = {
      document: {
        readyState: '',
        addEventListener: jasmine.createSpy('doc.addEventListener'),
        removeEventListener: jasmine.createSpy('doc.removeEventListener')
      },
      addEventListener: jasmine.createSpy('win.addEventListener'),
      removeEventListener: jasmine.createSpy('win.removeEventListener'),
      Promise: window.Promise
    }
    use(global).as(Global);
  });

  it('should resolve the promise if the readyState is "complete"', (done)=>{
    global.document.readyState = 'complete';
    inject(DocumentReady, (dr)=>{
      dr.then(function(doc) {
        expect(doc).toBe(global.document);
        done();
      });
    });
  });

  describe('readyState != "complete"', ()=>{

    it('should resolve on DOMContentLoaded and remove the event listeners', (done)=>{
      inject(DocumentReady, (dr)=>{
        global.document.addEventListener.calls.mostRecent().args[1]();

        dr.then(function(doc) {
          expect(global.document.removeEventListener).toHaveBeenCalled();
          expect(global.removeEventListener).toHaveBeenCalled();
          expect(doc).toBe(global.document);
          done();
        });
      });
    });

    it('should resolve on window.load and remove the event listeners', (done)=>{
      inject(DocumentReady, (dr)=>{
        global.addEventListener.calls.mostRecent().args[1]();

        dr.then(function(doc) {
          expect(global.document.removeEventListener).toHaveBeenCalled();
          expect(global.removeEventListener).toHaveBeenCalled();
          expect(doc).toBe(global.document);
          done();
        });
      });
    });

  });
});