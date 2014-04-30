import {mixinCustomElementDi} from './di/ce_di';

import {ComponentDirective} from './annotations';
import {ViewFactory} from './view_factory';
import {ComponentLoader} from './component_loader';
import {getAnnotation} from './util/misc';
import {Inject, TransientScope} from 'di';
import {RootInjector} from './di/node_injector';


@Inject(ComponentLoader, RegisterCustomElement)
@TransientScope
export function registerNgElement(
  componentLoader, registerCustomElement
) {
  var ngElementProto = Object.create(HTMLElement.prototype);
  ngElementProto.createdCallback = createdCallback;
  return document.registerElement('ng-element', {
    prototype: ngElementProto
  });

  function createdCallback() {
    var templateElement = this.querySelector('template');
    componentLoader.loadFromElement(templateElement, ({template, directive})=>{
      registerCustomElement(
        document,
        directive,
        template
      );
    });
  }
}

@Inject(ViewFactory, RootInjector)
function RegisterCustomElement(viewFactory, rootInjector) {
  return function(document, component, template) {
    var proto = Object.create(HTMLElement.prototype);
    proto.createdCallback = createdCallback;
    var annotation = getAnnotation(component, ComponentDirective);
    // TODO: Do we really want to make the element this "this" for angular custom elements?
    // Mixin the component into the element hierarchy
    component.prototype.__proto__ = proto;
    mixinCustomElementDi({type:component, providers:viewFactory._getComponentProviders(component), callbacks:{
      created: 'createdCallback',
      attached: 'attachedCallback',
      detached: 'detachedCallback'
    }, rootInjector});
    document.registerElement(annotation.selector, {
      prototype: component.prototype
    });

    function createdCallback() {
      viewFactory._initComponentDirective({
        component, element:this, nodeInjector:this.ngData.injector
      });
    };
  };
}
