import {inject} from 'di/testing';
import {Injector} from 'di/injector';
import {Compiler} from '../../src/compiler';
import {DirectiveClass} from '../../src/directive_class';
import {NgIf} from '../../src/directives/ng_if';
import {$, $html} from '../dom_mocks';

describe('ngIf', ()=>{
  var view, container, ngIf;
  beforeEach( ()=> {
    inject(Compiler, Injector, (compiler, rootInjector) => {
      container = $('<div><a ng-if=""></a></div>')[0];
      var viewFactory = compiler.compileChildNodes(container, [NgIf]);

      view = viewFactory.createView(rootInjector, {}, true);
      var anchor = container.childNodes[0];
      ngIf = anchor.injector.get(NgIf);
    });
  });

  it('should not show the content initially', ()=>{
    expect($html(container.childNodes)).toBe('<!--template anchor-->')
  });

  it('should show the content when the value is true', ()=>{
    ngIf.ngIf = true;
    expect($html(container.childNodes)).toBe('<a ng-if=""></a><!--template anchor-->')
  });

  it('should hide the content when the value is falsy', ()=>{
    ngIf.ngIf = false;
    expect($html(container.childNodes)).toBe('<!--template anchor-->')
  });

});
