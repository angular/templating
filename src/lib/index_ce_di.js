// templating module to be used when Angular templating is not needed.
export {
  Queryable,
  AttachAware,
  QueryScope
} from './annotations';

export {
  InjectQuery
} from './di/injector_queries';

export * from './di/node_injector';
export * from './di/ce_di_bootstrap';
import {bootstrap} from './di/ce_di_bootstrap';
bootstrap();
