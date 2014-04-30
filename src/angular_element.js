import {ViewFactory} from './view_factory';
import {Compiler} from './compiler/compiler';
import {ComponentDirective, Directive} from './annotations';
import {getImportParameters} from './util/import_node';
import {AnnotationProvider} from './util/annotation_provider';
import {Injector, Provide} from 'di';

// TODO: use DI here!
var annotationProvider = new AnnotationProvider();

export function registerAngularElement(document) {
  var AngularElementProto = Object.create(HTMLElement.prototype);
  AngularElementProto.createdCallback = function() {

    // Wait until the custom elements for child <script type="module"> elements have been upgraded
    // We assume that they are in the same template, i.e. the browser should upgrade them in the same turn.
    window.setTimeout(run.bind(this), 0);

    function run() {
      var moduleEls = Array.prototype.slice.call(this.querySelectorAll('script[type="module"]'));
      var name = this.getAttribute('name');
      var template = this.querySelector('template');
      var modulePromises = moduleEls.map((moduleEl) => moduleEl.promise);
      Promise.all(modulePromises).then(function(modules) {
        var {provides, component, directives} = parseModules(modules, name);
        register(document, name, provides, component, directives, template);
      }).catch((e)=>{
        // TODO: Nice error handling!
        console.log(e.stack);
      });
    }
  };

  document.registerElement('angular-element', {
    prototype: AngularElementProto
  });
}

function parseModules(modules, componentName) {
  var provides = [];
  var component;
  var directives = [];
  modules.forEach((module) => {
    var exportValue;
    for (var exportName in module) {
      exportValue = module[exportName];
      if (typeof exportValue === 'function') {
        var directiveAnnotation = annotationProvider(exportValue, Directive);
        if (directiveAnnotation instanceof ComponentDirective) {
          component = {
            annotation: directiveAnnotation,
            clazz: exportValue
          };
        } else {
          directives.push(exportValue);
        }
        var provideAnnotation = annotationProvider(exportValue, Provide);
        if (provideAnnotation) {
          provides.push(exportValue);
        }
      }
    }
  });
  return {provides, component, directives};
}

export function register(doument, name, provides, component, directives, template) {
  // Compile the template only once, using an injector that only contains the
  // modules defined inside of <angular-element>.
  // Because of this a template author can overwrite e.g. the symbols to be used for
  // binding.
  var compileInjector = new Injector(provides);
  var compiler = compileInjector.get(Compiler);
  var compiledTemplate = compiler.compileChildNodes(template.content, directives);

  var proto = Object.create(HTMLElement.prototype);
  // TODO: copy all the methods from component.class over to proto
  // with a proxy that uses ngNode!

  proto.createdCallback = function() {
    var self = this;
    var parentInjector = getImportParameters(this);
    var injector;
    if (parentInjector) {
      injector = parentInjector.createChild(provides);
    } else {
      injector = compileInjector;
    }
    var viewFactory = injector.get(ViewFactory);
    var componentView;
    if (parentInjector) {
      createView();
    }
    if (!parentInjector) {
      // Note: We need to create the zone here,
      // as creating the view will already install
      // event handlers, ... that the zone needs to intercept.
      window.zone.fork({
        afterTask: function () {
          // TODO: Check if the watchgroup is suspended and not digest then.
          if (componentView) {
            componentView.digest();
          }
        },
        onError: function(err) {
          // TODO(vojta): nice error handling for Tobias
          console.log(err.stack)
        }
      }).run(createView);
    }
    // TODO: Suspend the WatchGroup

    function createView() {
      componentView = viewFactory.createComponentView({
        parentInjector, element:self, component:component.clazz, template: compiledTemplate
      });
    }
  };

  proto.attachedCallback = function() {
    // TODO: resume the watchgroup
    var view = this.ngNode.data.componentView;
  };

  proto.detachedCallback = function() {
    // TODO: suspend the watchgroup
    var view = this.ngNode.data.componentView;
  };

  document.registerElement(name, {
    prototype: proto
  });
}

