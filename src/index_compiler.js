export * from './compiler/compiler';
export * from './compiler/compiler_config';
// Only need to load it so that requirejs gets instrumented
import './compiler/requirejs_html';

// TODO: precompile
