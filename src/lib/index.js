export * from './annotations';
export * from './directive/ng_if';
export * from './directive/ng_repeat';

export {
  View, ViewPort
} from './view';
export {
  ViewFactory,
  BoundViewFactory,
  InitAttrs
} from './view_factory';
export {
  ChangeEventConfig
} from './watch_group';
export {
  ComponentLoader
} from './component_loader';
export {
  InjectQuery
} from './di/injector_queries';
export * from './directive/index';

import {installModuleAnnotator} from './util/module_annotator';
installModuleAnnotator(window.requirejs);

import {bootstrap} from './bootstrap';
bootstrap();