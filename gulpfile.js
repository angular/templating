var gulp = require('gulp');
var pipe = require('pipe/gulp');

var clean = require('gulp-clean');
var connect = require('gulp-connect');
var traceur = require('gulp-traceur');

var through = require('through2');

var runSequence = require('run-sequence');
var mergeStreams = require('event-stream').merge;

var path = {
  lib: ['./src/lib/**/*.js'],
  util: ['./src/util/**/*.js', './src/lib/load_barrier.js'],
  example: ['./src/example/**/*.js'],
  exampleCopy: ['./src/example/**/*.html'],
  testLib: ['./test/lib/**/*.js'],
  testExample: ['./test/example/**/*.js'],
  deps: {
    'watchtower': './node_modules/watchtower/src/**/*.js',
    'expressionist': './node_modules/expressionist/src/**/*.js',
    'di': './node_modules/di/src/**/*.js',
    'rtts-assert': './node_modules/rtts-assert/src/**/*.js'
  },
  output: 'dist'
};

gulp.task('clean', function() {
  return gulp.src([path.output], {read: false})
      .pipe(clean());
});

function buildForPlatform(name, options) {
  var inlineOptions = {};
  Object.keys(options).forEach(function(optName) {
    inlineOptions[optName] = options[optName];
  });
  inlineOptions.modules = 'inline';
  var streams = [
    gulp.src(path.lib)
        .pipe(traceur(pipe.traceur(options)))
        .pipe(gulp.dest(path.output+'/'+name+'/lib')),
    gulp.src(path.util)
        .pipe(traceur(pipe.traceur(inlineOptions)))
        .pipe(gulp.dest(path.output+'/'+name+'/util')),
    gulp.src(path.example)
        .pipe(traceur(pipe.traceur(options)))
        .pipe(gulp.dest(path.output+'/'+name+'/example')),
    gulp.src(path.testLib)
        .pipe(traceur(pipe.traceur(options)))
        .pipe(gulp.dest(path.output+'/'+name+'/test/lib')),
    gulp.src(path.testExample)
        .pipe(traceur(pipe.traceur({modules: 'commonjs'})))
        .pipe(gulp.dest(path.output+'/'+name+'/test/example')),
    gulp.src(path.exampleCopy)
        .pipe(gulp.dest(path.output+'/'+name+'/example'))
  ];
  return mergeStreams.apply(null, streams);
}

gulp.task('build_source_amd', function() {
  return buildForPlatform('amd', {modules: 'amd'});
});

gulp.task('build_source_es6', function() {
  return buildForPlatform('es6', {outputLanguage: 'es6'});
});

gulp.task('build_source_cjs', function() {
  return buildForPlatform('cjs', {modules: 'commonjs'});
});

gulp.task('build_deps', function() {
  var streams = Object.keys(path.deps).map(function(prop) {
    return gulp.src(path.deps[prop])
        .pipe(traceur(pipe.traceur()))
        .pipe(gulp.dest('node_modules/' + prop + '/dist/amd'));
  });
  return mergeStreams.apply(null, streams);
});

gulp.task('build', function(done) {
  // By using runSequence here we are decoupling the cleaning from the rest of the build tasks
  // Otherwise, we have to add clean as a dependency on every task to ensure that it completes
  // before they begin.
  runSequence(
    'clean',
    ['build_source_amd', 'build_source_cjs', 'build_source_es6', 'build_deps'],
    done
  );
});


// WATCH FILES FOR CHANGES
gulp.task('watch', ['build_source_amd'], function() {
  gulp.watch([path.lib, path.util, path.example, path.exampleCopy, path.testLib, path.testExample], ['build_source_amd']);
});


// WEB SERVER
gulp.task('serve', connect.server({
  root: [__dirname],
  port: 8000,
  livereload: false,
  open: false
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

