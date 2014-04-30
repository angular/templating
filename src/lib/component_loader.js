import {getAnnotation} form './util/misc';
import {Directive, ComponentDirective} from './annotations';
import {Inject, Provide, Injector} from 'di';
import {Compiler} from './compiler/compiler';
import {loadBarrier} from './load_barrier';

// TODO: Cache also pending stuff
// -> no duplicate compilation
// -> do performance tests!
// See http://thanpol.as/javascript/promises-a-performance-hits-you-should-be-aware-of/
export class ComponentLoader {
  @Inject(Injector)
  constructor(injector) {
    this._injector = injector;
    this._templateCache = new Map();
    this._templateUrlCache = {};
  }
  getTemplateForDirective(directive) {
    return this._templateCache.get(directive);
  }
  // Note: we are not using a promise here by purpose,
  // as we want to call all of the done callbacks in the same turn,
  // and using promises can easily wait until another turn by chained .next() calls.
  loadFromElement(element, done) {
    var {directiveModuleId, selectDirective, elementBaseUrl} = this._getDirectiveSelector(element);
    var ngConfigAttr = element.getAttribute('ng-config')||'';
    var configModuleIds;
    if (ngConfigAttr) {
      configModuleIds = (ngConfigAttr).split(/\s*,\s*/);
    } else {
      configModuleIds = [];
    }
    configModuleIds.push(directiveModuleId);
    configModuleIds = configModuleIds.map((moduleId) => {
      if (!moduleId.match(/.*\/\/.*/)) {
        moduleId = elementBaseUrl + moduleId;
      }
      // TODO: This might not work when we have query parameters, ..
      moduleId = this._getRelativeUrl(moduleId, document.location.href.replace(/#.*/,''));
      if (moduleId === '') {
        moduleId = 'index.js';
      }
      return moduleId;
    });
    var loadDone = loadBarrier(done);
    // TODO: support ES6 loader as well!
    require(configModuleIds, (...modules) => {
      var componentModule = modules.pop();
      var directive = selectDirective(componentModule);
      var directiveAnnotation = getAnnotation(directive, ComponentDirective);
      var existingTemplate = this.getTemplateForDirective(directive);
      if (existingTemplate) {
        // cycle detected...
        loadDone({
          elementName: directiveAnnotation.selector,
          args: [{
            elementName: directiveAnnotation.selector,
            directive,
            template: existingTemplate
          }]
        });
        return;
      }
      var providers = directiveAnnotation.providers || [];
      var {directives, components:usedComponents} = this._findDirectivesInModules(modules);
      // create child injector so the given providers can be applied,
      // as they might want to configure the Compiler...
      var compileInjector = this._injector.createChild(providers);
      var compiler = compileInjector.get(Compiler);
      var templateContainer = element.content || element;
      var compiledTemplate = compiler.compileChildNodes(templateContainer, directives);

      // for angular components:
      // use the found component directives to load the corresponding html imports
      // and compile them as well.
      usedComponents.forEach((directive) => {
        if (!this.getTemplateForDirective(directive)) {
          this._loadByDirective(directive);
        }
      });
      this._templateCache.set(directive, compiledTemplate);
      loadDone({
        elementName: directiveAnnotation.selector,
        args: [{
          elementName: directiveAnnotation.selector,
          directive,
          template: compiledTemplate
        }]
      });
    });
  }
  loadFromTemplateUrl({templateUrl, templateId, done}) {
    var cacheKey = templateUrl+'#'+templateId;
    var cachedEntry = this._templateUrlCache[cacheKey];
    if (cachedEntry) {
      done(cachedEntry);
      return;
    }
    var loadDone = loadBarrier();
    this._loadElementsByUrl(templateUrl, 'template[ng-config]', (elements) => {
      if (templateId) {
        elements = elements.filter( (element) => element.id === templateId );
      }
      this.loadFromElement(elements[0], (entry) => {
        this._templateUrlCache[cacheKey] = entry;
        done(entry);
      });
    });
    loadDone();
  }
  _loadByDirective(componentDirective) {
    var {templateUrl, selectTemplate} = this._getTemplateSelector(componentDirective);
    var loadDone = loadBarrier();
    this._loadElementsByUrl(templateUrl, 'template[ng-config]', (elements) => {
      this.loadFromElement(selectTemplate(elements), null);
      loadDone();
    });
  }
  // strategy how to lookup the component directive given a template element
  _getDirectiveSelector(element) {
    var self = this;
    var elementId = element.getAttribute('id');
    var elementUrl = this._getElementUrl(element);
    var elementBaseUrl = elementUrl.replace(/(.*\/)[^\/]*/, '$1');
    var directiveModuleId = elementUrl.replace(/.html$/,'');
    return {
      directiveModuleId: directiveModuleId,
      elementBaseUrl: elementBaseUrl,
      selectDirective: select
    };

    function select(module) {
      if (elementId) {
        return module[elementId];
      }
      var {components} = self._findDirectivesInModules([module]);
      if (components.length > 0) {
        return components[0];
      }
      throw new Error('Could not find the directive for template at url '+elementUrl);
    }
  }
  // strategy how to lookup the template element given a component directive
  _getTemplateSelector(directive) {
    var annotation = getAnnotation(directive, Directive);
    var templateUrl = annotation.moduleId + '.html';
    var className = directive.constructor.name;
    return {
      templateUrl,
      selectTemplate: select
    };

    function select(elements) {
      var idResult, noIdResult;
      elements.forEach((element) => {
        if (!element.id) {
          noIdResult = element;
        }
        if (element.id === className) {
          idResult = element;
        }
      });
      return idResult ? idResult: noIdResult;
    }
  }
  _findDirectivesInModules(modules) {
    var directives = [];
    var components = [];
    modules.forEach((module) => {
      var exportValue;
      for (var exportName in module) {
        exportValue = module[exportName];
        if (typeof exportValue === 'function') {
          var directiveAnnotation = getAnnotation(exportValue, Directive);
          if (directiveAnnotation) {
            directives.push(exportValue);
          }
          if (directiveAnnotation instanceof ComponentDirective) {
            components.push(exportValue);
          }
        }
      }
    });
    return {directives, components};
  }
  _getElementUrl(element) {
    var url = element.getAttribute('assetpath');
    if (!url) {
      var doc = element.ownerDocument;
      var a = doc.createElement('a');
      a.href = '';
      return a.href;
    }
    return url;
  }
  _loadElementsByUrl(url, selector, done) {
    // Look into the main document if we can find a template with this assetpath.
    // if so, use it (to support vulcanizer!)
    var templateElements = document.querySelectorAll(selector + `[assetpath="${url}"]`);
    var promise;
    if (templateElements.length) {
      done(Array.prototype.slice.call(templateElements));
    } else {
      this._importDocument(url, (doc) => {
        done(Array.prototype.slice.call(doc.querySelectorAll(selector)));
      });
    }
  }
  _importDocument(url, done) {
    var link = document.createElement('link');
    link.rel = 'import';
    link.href = url;
    link.addEventListener('load', () => {
      done(link.import);
      link.remove();
    }, false);
    document.body.appendChild(link);
  }
  _getRelativeUrl(src, base) {
    var srcSlashParts = src.split('/');
    var baseSlashParts = base.split('/');
    var res = [];
    for (var i=0; i<Math.min(srcSlashParts.length, baseSlashParts.length); i++) {
      var srcPart = srcSlashParts[i];
      var basePart = baseSlashParts[i];
      if (srcPart !== basePart) {
        break;
      }
    }
    var count = baseSlashParts.length - i - 1;
    while (count>0) {
      res.push('..');
      count--;
    }
    while (i<srcSlashParts.length) {
      res.push(srcSlashParts[i]);
      i++;
    }
    return res.join('/');
  }
}
