import {compile as traceur} from './traceur-api';
import {$, $html} from '../dom_mocks';
import {Injector} from 'di/injector';
import {precompile} from '../../src/precompiler';


describe('precompile', ()=>{
  /*
ViewFactory {templateContainer: SimpleNodeContainer, elementBinders: Array[4], createView: function}
  elementBinders: Array[4]
    0: ElementBinder
    1: ElementBinder
      attrs: NodeAttrs
        bind: Object
        event: Object
        init: Object
        __proto__: NodeAttrs
      component: Object
        directive: DirectiveClass
        viewFactory: ViewFactory
        __proto__: Object
      decorators: Array[0]
        length: 0
        __proto__: Array[0]
      level: 1
      nonElementBinders: Array[0]
        length: 0
        __proto__: Array[0]
        __proto__: ElementBinder
    2: ElementBinder
    3: ElementBinder
    length: 4
      __proto__: Array[0]
  templateContainer: SimpleNodeContainer
    childNodes: Array[1]
    nodeType: -1
    __proto__: SimpleNodeContainer
    __proto__: ViewFactory
*/  

  it('should create a viewFactory with requirejs', (done)=>{
    precompile({}, require, '<module src="sampleDirectives.js"></module><div></div>').then((viewFactoryES6Source)=>{
      var viewFactoryES5Source = traceur(viewFactoryES6Source, {
        modules: 'amd'
      }).js;
      viewFactoryES5Source = viewFactoryES5Source.replace(/templating\//, 'src/');

      // TODO: Use the ES6 loader here!
      var define = function(deps, callback) {      
        require(deps, function() {
          var module = callback(...arguments);
          var rootInjector = new Injector();
          var view = module.viewFactory.createView(rootInjector, {});
          expect($html(view.nodes)).toBe('<div></div>');

          done();        
        });
      }
      eval(viewFactoryES5Source);      
    });
  });

});
