import {inject} from 'di/testing';
import {Injector} from 'di/injector';
import {Compiler} from '../../src/compiler';
import {DirectiveClass} from '../../src/directive_class';
import {NgIf} from './ng_if';
import {$, $html} from '../dom_mocks';

describe('ngIf', ()=>{
  var view, container, ngIf, anchor;

  function compile(html) {
    inject(Compiler, Injector, (compiler, rootInjector) => {
      container = $('<div>'+html+'</div>')[0];
      var viewFactory = compiler.compileChildNodes(container, [NgIf]);

      view = viewFactory.createRootView(rootInjector, {}, true);
      anchor = container.lastChild;
    });
  }

  it('should not show the content initially if the attribute value is falsy', ()=>{
    compile('<a ng-if=""></a>');
    expect(anchor.ngIf).toBe(false);
    expect($html(container.childNodes)).toBe('<!--template anchor-->')
  });

  it('should show the content initially if the attribute value is truthy', ()=>{
    compile('<a ng-if="true"></a>');
    expect(anchor.ngIf).toBe(true);
    expect($html(container.childNodes)).toBe('<a ng-if="true"></a><!--template anchor-->')
  });

  it('should show the content when the value is true', ()=>{
    compile('<a ng-if=""></a>');
    anchor.ngIf = true;
    expect($html(container.childNodes)).toBe('<a ng-if=""></a><!--template anchor-->')
  });

  it('should hide the content when the value is falsy', ()=>{
    compile('<a ng-if=""></a>');
    anchor.ngIf = false;
    expect($html(container.childNodes)).toBe('<!--template anchor-->')
  });

});
