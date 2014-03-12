import {inject} from 'di/testing';
import {Injector} from 'di/injector';
import {Compiler} from '../../src/compiler';
import {DirectiveClass} from '../../src/directive_class';
import {NgIf} from '../../src/directives/ng_if';

describe('ngIf', ()=>{
  var view, container, ngIf;
  beforeEach( ()=> {
    inject(Compiler, (compiler) =>{
      container = $('<div><a ng-if=""></a></div>')[0];
      var viewFactory = compiler.compile([container], [
        new DirectiveClass(NgIf.annotations[0], NgIf)
      ]);
      var rootInjector = new Injector();

      // TODO: add flag to viewFactory to not clone the nodes?!
      // -> needed for initial compile, e.g. in tests or for index.html
      view = viewFactory.createView(rootInjector, {});     
      container = view.nodes[0];
      var anchor = container.childNodes[0]
      ngIf = anchor.injector.get(NgIf);
    });
  });

  it('should not show the content initially', ()=>{
      expect(container.innerHTML).toBe('<!--template anchor-->')
  });

  it('should show the content when the value is true', ()=>{
      ngIf.ngIf = true;
      expect(container.innerHTML).toBe('<a ng-if=""></a><!--template anchor-->')
  });

  it('should hide the content when the value is falsy', ()=>{
      ngIf.ngIf = false;
      expect(container.innerHTML).toBe('<!--template anchor-->')
  });

});
