import {inject} from 'di/testing';
import {ModuleLoader} from '../../src/util/module_loader';

describe('requirejs-html', ()=>{
  // TODO: Add more unit tests...

  it('should work in integration', (done)=>{
    inject(ModuleLoader, (loadModules)=>{
      loadModules(['test/loader/atemplate.html']).then((modules)=>{
        return modules[0].promise;
      }).then(function(data) {
        expect(data.template.container.innerHTML.trim())
          .toBe('<module src="./amodule"></module>\n\n<div>someTemplate</div>');
        expect(data.modules['test/loader/amodule'].anExport).toBe(true);
        done();
      });
    });
  });

});
