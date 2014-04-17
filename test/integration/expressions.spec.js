import {inject} from 'di/testing';
import {Injector} from 'di';
import {Compiler} from '../../src/compiler/compiler';
import {ViewFactory} form '../../src/view_factory';
import {$, $html} from '../dom_mocks';

describe('expressions', ()=>{
  var rootView, container, context;

  function compile(html, ctx={}) {
    context = ctx;
    inject(Compiler, ViewFactory, (compiler, viewFactory) => {
      container = $('<div>'+html+'</div>')[0];
      var template = compiler.compileChildNodes(container, []);

      rootView = viewFactory.createRootView({
        template: template,
        executionContext: context
      });
    });
  }

  it('should bind input value', ()=>{
    compile('<input type="text" bind-value="boundValue">', {
      boundValue: 'someValue'
    });
    var input = container.firstChild;

    rootView.digest();

    expect(input.value).toBe('someValue');
    expect(context.boundValue).toBe('someValue');

    input.value = 'anotherValue';

    triggerEvent(input, 'change');
    rootView.digest();

    expect(context.boundValue).toBe('anotherValue');
  });

});

function triggerEvent(node, evtName, data) {
  var evt = document.createEvent('Event');
  evt.initEvent(evtName, true, true);
  for (var prop in data) {
    evt[prop] = data[prop];
  }
  node.dispatchEvent(evt);
}
