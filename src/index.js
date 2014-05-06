export {
  Directive,
  DecoratorDirective,
  TemplateDirective,
  ComponentDirective
} from './annotations';
export {
  RootView, View, ViewPort
} from './view';
export {
  ViewFactory,
  BoundViewFactory
} from './view_factory';
export {
  ChangeEventConfig
} from './observer_selector';

import {registerAngularElement} from './angular_element';
registerAngularElement(window.document);