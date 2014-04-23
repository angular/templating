import {Provide} from 'di';
import {ChangeEventConfig} from 'templating';

// root components
// TODO: Need to use "examples" prefix here, otherwise
// requirejs will not load the recursive template during precompile
// - might be casued that we use the path 'examples/greet' during
//   precompile as well.
export * from 'examples/greet';

// configuration / DI overrides
@Provide(ChangeEventConfig)
export function eventConfig() {
  var defaultConfig = ChangeEventConfig();
  // TODO: Add events for xtags elements here!
  return defaultConfig;
}