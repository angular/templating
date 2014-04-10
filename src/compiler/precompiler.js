import {Injector, Inject} from 'di';
import {Compiler} from './compiler';
module viewFactoryModule from '../view_factory';
import {NodeAttrs} from '../types';
import {createObject, createNode} form '../instantiate_helper';
import {ModuleLoader} from '../module_loader';

@Inject(ModuleLoader)
export function Precompile(moduleLoader) {
  return precompile;

  function precompile(filePath) {
    return moduleLoader([filePath]).then(function(modules) {
      var module = modules[0];
      return module.promise;
    }).then(function(viewFactoryWithModules) {
      var vf = viewFactoryWithModules.viewFactory;
      var modulesWithNames = viewFactoryWithModules.modules;
      var exports = [];
      for (var moduleName in modulesWithNames) {
        collectExports(moduleName, modulesWithNames[moduleName], true, exports);
      }
      collectExports('templating', viewFactoryModule, false, exports);
      exports.push({
        module: 'templating',
        name: 'NodeAttrs',
        type: NodeAttrs,
        dynamic: false
      });
      // TODO: Check/improve the error handling,
      // as errors don't show up in the tests.
      var res = serialize(vf, 'promise', exports);
      return res;
    });
  }

}

function collectExports(moduleName, module, dynamic, target) {
  target = target || [];
  for (var exportName in module) {
    target.push({
      module: moduleName,
      name: exportName,
      type: module[exportName],
      dynamic: dynamic
    });
  }
  return target;
}

export function serialize(object, exportName, moduleNameWithExports) {
  var builder = new Builder(moduleNameWithExports);
  moduleNameWithExports.push({
    module: 'templating', name: 'createObject', type: createObject, dynamic: false
  });
  moduleNameWithExports.push({
    module: 'templating', name: 'createNode', type: createNode, dynamic: false
  });
  // TODO: Make this nicer...
  builder.createObjectVar = builder.addImport(createObject);
  builder.createNodeVar = builder.addImport(createNode);
  serializeRecurse(builder, object);

  return builder.build(exportName);
}


function serializeRecurse(builder, object) {
  if (object && typeof object === 'object') {
    if (object.constructor === Date) {
      builder.appendLine('new Date('+object.getTime()+')');
    } else if (object.constructor === RegExp) {
      builder.appendLine('/'+object.source+'/');
    } else if (object.constructor === Array) {
      builder.appendLine('[');
      serializeArray(builder, object);
      builder.appendLine(']');
    } else if (object.nodeName) {
      serializeNode(builder, object);
    } else if (object.constructor === Object) {
      builder.appendLine('{');
      serializeDirectProps(builder, object);
      builder.appendLine('}');
    } else {
      var exportName = builder.addImport(object.constructor);
      builder.appendLine(builder.createObjectVar + '('+exportName+',{');
      serializeDirectProps(builder, object);
      builder.appendLine('})');
    }
  } else {
    builder.appendLine(JSON.stringify(object));
  }
}

function serializeDirectProps(builder, object) {
  var first = true;
  for (var prop in object) {
    if (object.hasOwnProperty(prop)) {
      if (!first) {
        builder.append(',');
      } else {
        first = false;
      }
      builder.append('"'+prop+'":');
      serializeRecurse(builder, object[prop]);
    }
  }
}

function serializeArray(builder, object) {
  var first = true;
  for (var i=0; i<object.length; i++) {
    if (!first) {
      builder.append(',');
    } else {
      first = false;
    }
    serializeRecurse(builder, object[i]);
  }
}

function serializeNode(builder, node) {
  var html;
  if (node.nodeType === Node.ELEMENT_NODE) {
    html = node.outerHTML;
  } else {
    // clone the node as we move it into another place to be able to convert it into
    // html
    var clone = node.cloneNode(true);
    var container = document.createElement('div');
    container.appendChild(node);
    html = container.innerHTML;
  }

  builder.appendLine(builder.createNodeVar+"("+node.nodeType+",'"+escapeHTMLAsString(html)+"')");
}

function escapeHTMLAsString(string) {
  var res = string.replace("'", '"').replace('\n', '');
  return res;
}

// TODO: Move more of the logic to build objects,
// functions calls, ... into this Builder class!
class Builder {
  constructor(moduleNameWithExports) {
    this.result = '';
    this.imports = [];
    this.moduleNameWithExports = moduleNameWithExports;
  }
  addImport(type) {
    // TODO: Make this faster!
    var self = this;
    var importVariable = this.moduleNameWithExports.reduce(function(importVariable, exported) {
      if (importVariable) {
        return importVariable;
      }
      if (exported.type === type) {
        var variable = 'imp_'+self.imports.length;
        self.imports.push({
          module: exported.module,
          name: exported.name,
          dynamic: exported.dynamic,
          variable: variable
        });
        return variable;
      } else {
        return null;
      }
    }, null);
    if (!importVariable) {
      throw new Error('No module provided for objects of type '+type);
    }
    return importVariable;
  }
  appendLine(string) {
    this.append(string+'\n');
    return this;
  }
  append(string) {
    this.result += string;
    return this
  }
  _serializeStaticImports() {
    var importLines = [];
    this.imports.forEach((imported) => {
      if (!imported.dynamic) {
        importLines.push('import {'+imported.name+' as '+
          imported.variable+'} from "'+imported.module+'";');
      }
    });
    return importLines.join('\n');
  }
  _serializeDynamicImports(body) {
    var modules = [];
    var moduleVars = [];
    var importedNames = [];
    this.imports.forEach((imported, index) => {
      if (imported.dynamic) {
        modules.push(imported.module);
        var moduleVar = 'mod'+index;
        moduleVars.push(moduleVar);
        importedNames.push('var '+imported.variable+'='+(moduleVar + '.' + imported.name)+';');
      }
    });
    if (!importedNames.length) {
      return body;
    }
    // TODO: Use ModuleLoader here (can't right now as
    //   ModuleLoader needs an Injector...)
    var res = 'require(["' + modules.join('","') + '"],' +
       ' function(' + moduleVars.join(',') + ') {\n' + importedNames.join('\n');
    return res + '\n ' + body + '\n});';
  }
  build(exportName) {
    return this._serializeStaticImports() + '\n'
      + 'export var '+exportName+'= new Promise(function(resolve) { \n'
      + this._serializeDynamicImports('resolve(' + this.result+');')+'; });'
  }
}

