import {Provide, Inject} from 'di';
import {ChangeEventConfig} from 'templating';
import {XTagsEventConfig} from './xtags_event_config';

// config for DI
@Inject
@Provide(ChangeEventConfig)
export function AppChangeEventConfig() {
  var res = [];
  res.push(...ChangeEventConfig);
  res.push(...XTagsEventConfig);
  return res;
}

// root components
// TODO: Need to use "examples" prefix here, otherwise
// requirejs will not load the recursive template during precompile
// - might be casued that we use the path 'examples/greet' during
//   precompile as well.
export * from 'examples/greet';

