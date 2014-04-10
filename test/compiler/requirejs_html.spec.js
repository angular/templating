import {inject} from 'di/testing';
import {ModuleLoader} from '../../src/module_loader';

describe('requirejs-html', ()=>{
  // TODO: Add more unit tests...

  it('should work in integration', (done)=>{
    inject(ModuleLoader, (loadModules)=>{
      loadModules(['test/compiler/atemplate.html']).then((modules)=>{
        return modules[0].promise;
      }).then(function(data) {
        expect(data.viewFactory.templateContainer.innerHTML.trim())
          .toBe('<module src="./amodule"></module><div>someTemplate</div>');
        expect(data.modules['test/compiler/atemplate/.././amodule'].anExport).toBe(true);
        done();
      });
    });
  });

});
