var gulp = require('gulp');
var pipe = require('pipe/gulp');
var connect = require('gulp-connect');
var traceur = require('gulp-traceur');
var through = require('through2');
// var precompile = require('./gulp-precompile');

var path = {
  src: ['./src/**/*.js'],
  examples: ['./examples/**/*.js'],
  exampleTemplates: ['./examples/**/*.html'],
  deps: {
    'watchtower': './node_modules/watchtower/src/**/*.js',
    'expressionist': './node_modules/expressionist/src/**/*.js',
    'di': './node_modules/di/src/**/*.js',
    'rtts-assert': './node_modules/rtts-assert/src/**/*.js'
  }
};

function rename(search, replace) {
  return through.obj(function(file, enc, cb) {
    file.path = file.path.replace(search, replace);
    this.push(file);
  });
}

// TRANSPILE ES6
gulp.task('build_source_amd', function() {
  gulp.src(path.src)
      .pipe(traceur(pipe.traceur()))
      .pipe(gulp.dest('dist/amd'));
});

gulp.task('build_source_es6', function() {
  gulp.src(path.src)
      .pipe(traceur(pipe.traceur({outputLanguage: 'es6'})))
      .pipe(gulp.dest('dist/es6'));
});

gulp.task('build_examples', ['build_deps'], function() {
  gulp.src(path.examples)
      .pipe(traceur(pipe.traceur()))
      .pipe(gulp.dest('temp/examples'));
  gulp.src(path.exampleTemplates)
      .pipe(gulp.dest('temp/examples'));
  /* TODO: Not working yet...
  gulp.src(path.exampleTemplates)
      .pipe(precompile())
      .pipe(traceur({}))
      .pipe(rename(/html$/, 'js'))
      .pipe(gulp.dest('test/examples/'));
  **/
});

gulp.task('build_deps', function() {
  for (var prop in path.deps) {
    gulp.src(path.deps[prop])
        .pipe(traceur(pipe.traceur()))
        .pipe(gulp.dest('node_modules/' + prop + '/dist/amd'));
  }
});

gulp.task('build_source_cjs', function() {
  gulp.src(path.src)
      .pipe(traceur(pipe.traceur({modules: 'commonjs'})))
      .pipe(gulp.dest('dist/cjs'));
});

gulp.task('build', ['build_source_amd', 'build_source_cjs', 'build_source_es6', 'build_examples']);


// WATCH FILES FOR CHANGES
gulp.task('watch', function() {
  gulp.watch([path.src], ['build_source_amd']);
  gulp.watch([path.examples, path.exampleTemplates], ['build_examples']);
});


// WEB SERVER
gulp.task('serve', connect.server({
  root: [__dirname],
  port: 8000,
  open: {
    browser: 'Google Chrome'
  }
}));


var clientify = require('clientify');
var rename = function(search, replace) {
  return through.obj(function(file, enc, done) {
    file.path = file.path.replace(search, replace);
    this.push(file);
    done();
  });
};

// Move to package.json?
var GITHUB_REPOS = [
  'angular/watchtower.js',
  'angular/expressionist.js',
  'angular/zone.js',
  'vojtajina/traceur-compiler#add-es6-pure-transformer-dist'
];

gulp.task('shrinkwrap', function() {
  gulp.src('./package.json')
    .pipe(through.obj(function(file, _, done) {
      var pkg = JSON.parse(file.contents);
      var stream = this;
      clientify.shrinkwrap(pkg, GITHUB_REPOS).then(function(shrinkwrap) {
        file.contents = new Buffer(JSON.stringify(shrinkwrap, null, '  '));
        stream.push(file);
        done();
      }).done();
    }))
    .pipe(rename('package.json', 'npm-shrinkwrap.json'))
    .pipe(gulp.dest('.'));
});


// TODO(vojta): extract into a gulp plugin
var requirejs = require('requirejs');
var patchFn = require('./utils/loader');
var jsdom = require('jsdom');
var classListPolyfill = require('./utils/jsdom_classlist_polyfill');

gulp.task('templates', function() {

  // Create jsdom instance
  var document = jsdom.jsdom('<html></html>', null, {
    features: {
      FetchExternalResources : false,
      ProcessExternalResources : false
    }
  });
  var window = document.createWindow();

  classListPolyfill(window.self);

  // Stuff that is used even when requiring precompiler and its deps.
  global.document = window.document;
  global.Node = window.Node;
  global.Comment = window.Comment;
  global.HTMLElement = window.HTMLElement;
  global.Text = window.Text;

  // Patch RequireJS (to run all *.html files through the compile_ng_template plugin).
  var patchedRequireJs = patchFn(global.requirejsVars.requirejs);
  global.requirejsVars.requirejs = patchedRequireJs;
  global.requirejs = patchedRequireJs;
  global.requirejsVars.define = patchFn(global.requirejsVars.define);

  patchedRequireJs.config({
    paths: {
      'deps': process.cwd() + '/node_modules',
      'examples': process.cwd() + '/temp/examples',
      'dist': process.cwd() + '/dist'
    },
    map: {
      '*': {
        'templating': 'dist/amd/index',
        'compile_ng_template': 'dist/amd/node/require_plugin',
        'di': 'deps/di/dist/amd/index',
        'rtts-assert': 'deps/rtts-assert/dist/amd/assert',
        'expressionist': 'deps/expressionist/dist/amd/index',
        'watchtower': 'deps/watchtower/dist/amd/index'
      }
    }
  });

  gulp.src('examples/*.html')
      .pipe(through.obj(function(file, _, done) {
        var stream = this;

        patchedRequireJs(['traceur/bin/traceur-runtime', 'es6-shim'], function() {
          var relativeTemplatePath = file.path.replace(file.cwd + '/', '');

          patchedRequireJs([relativeTemplatePath], function(module) {
            module.promise.then(function(data) {
              file.contents = new Buffer(data.es6Source);
              stream.push(file);
              done();
            }, function(e) {
              // TODO(vojta): nice error handling ;-)
              console.log(e.stack)
            })
          });
        });
      }))
      .pipe(traceur(pipe.traceur()))
      .pipe(rename(/\.html$/, '.html.js'))
      .pipe(gulp.dest('temp/examples/'))
})
