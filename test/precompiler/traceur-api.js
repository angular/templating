// This is a copy of the traceur node module,
// with some adjustments so it runs in the browser.
var traceur = window.traceur;

var AttachModuleNameTransformer =
    traceur.codegeneration.module.AttachModuleNameTransformer;
var ErrorReporter = traceur.util.TestErrorReporter;
var FromOptionsTransformer = traceur.codegeneration.FromOptionsTransformer;
var Parser = traceur.syntax.Parser;
var SourceFile = traceur.syntax.SourceFile;
var SourceMapGenerator = traceur.outputgeneration.SourceMapGenerator;
var TreeWriter = traceur.outputgeneration.TreeWriter;
var traceurOptions = traceur.options;

function merge(dest) {
  var src, i;
  for (i = 1; i < arguments.length; i++) {
    src = arguments[i];
    Object.keys(src).forEach(function(key) {
      dest[key] = src[key];
    });
  }

  return dest;
}
/**
 * Compile ES6 source code with Traceur.
 *
 * TODO(vojta): Support source maps.
 *
 * @param  {string} content ES6 source code.
 * @param  {Object=} options Traceur options.
 * @return {string} Transpiled ES5 code.
 */
export function compile(content, options) {
  options = merge({
    modules: 'commonjs',
    filename: '<unknown file>',
    sourceMap: false,
    cwd: '/'
  }, options || {});

  traceurOptions.reset();
  merge(traceurOptions, options);

  var errorReporter = new ErrorReporter();
  var sourceFile = new SourceFile(options.filename, content);
  var parser = new Parser(sourceFile, errorReporter);
  var tree = parser.parseModule();
  var moduleName = options.filename.replace(/\.js$/, '');
  var transformer = new AttachModuleNameTransformer(moduleName);
  tree = transformer.transformAny(tree);
  transformer = new FromOptionsTransformer(errorReporter);
  var transformedTree = transformer.transform(tree);

  if (errorReporter.hadError()) {
    return {
      js: null,
      errors: errorReporter.errors,
      sourceMap: null
    };
  }

  var treeWriterOptions = {};

  if (options.sourceMap) {
    treeWriterOptions.sourceMapGenerator = new SourceMapGenerator({
      file: options.filename,
      sourceRoot: null
    });
  }

  return {
    js: TreeWriter.write(transformedTree, treeWriterOptions),
    errors: errorReporter.errors,
    sourceMap: treeWriterOptions.sourceMap || null
  };
};
