import {Injector} from 'di';
import {Compiler} from './compiler';
import {ViewFactory, ElementBinder} from '../view_factory';
import {NodeAttrs} from '../types';

export function precompile(config, loder, html) {
  // TODO: How to configure this injector??
  // TODO: Where to get the CompilerConfig from??
  var injector = new Injector();
  var compiler = injector.get(Compiler);
  var el = document.createElement('div');
  el.innerHTML = html;
  var moduleNameWithExports = {
    'templating': { 
      'ViewFactory': ViewFactory,
      'ElementBinder': ElementBinder,
      'NodeAttrs': NodeAttrs
    }
  };
  // TODO: Load the modules that are specified in the html
  var vf = compiler.compileChildNodes(el, []);
  return Promise.resolve(serialize(vf, 'viewFactory', moduleNameWithExports));
}


export function serialize(object, exportName, moduleNameWithExports) {
  var builder = new Builder(),
      imports = {
        'createObject': 'templating'
      };
  serializeRecurse(builder, imports, object, moduleNameWithExports);

  return serializeImports(imports) + '\n' 
    + 'export var '+exportName+'='+builder.result+';';
}

function serializeImports(imports) {
  var importLines = [];
  for (var varName in imports) {
    importLines.push('import {'+varName+'} from "'+imports[varName]+'";');
  }
  return importLines.join('\n');
}

function findModuleAndExport(type, moduleNameWithExports) {
  var currType;
  for (var moduleName in moduleNameWithExports) {
    for (var exportName in moduleNameWithExports[moduleName]) {
      currType = moduleNameWithExports[moduleName][exportName];
      if (currType === type) {
        return {
          moduleName: moduleName,
          exportName: exportName
        };
      }
    }
  }
  return null;
}

function serializeRecurse(builder, imports, object, moduleNameWithExports) {
  if (object && typeof object === 'object') {      
    if (object.constructor === Date) {
      builder.appendLine('new Date('+object.getTime()+')');
    } else if (object.constructor === RegExp) {
      builder.appendLine('/'+object.source+'/');
    } else if (object.constructor === Array) {
      builder.appendLine('[');
      serializeArray(object);
      builder.appendLine(']');
    } else if (object.nodeName) {
      serializeNode(object);
    } else if (object.constructor === Object) {
      builder.appendLine('{');
      serializeDirectProps(object);
      builder.appendLine('}');
    } else {
      var moduleAndExport = findModuleAndExport(object.constructor, moduleNameWithExports);
      if (moduleAndExport) {
        imports[moduleAndExport.exportName] = moduleAndExport.moduleName;
        imports['createObject'] = 'templating';
        builder.appendLine('createObject('+moduleAndExport.exportName+',{');
        serializeDirectProps(object);
        builder.appendLine('})');
      } else {
        throw new Error('No module provided for objects of type '+object.constructor);
      }
    }
  } else {
    builder.appendLine(JSON.stringify(object));
  }


  function serializeDirectProps(object) {
    var first = true;
    for (var prop in object) {
      if (object.hasOwnProperty(prop)) {
        if (!first) {
          builder.append(',');
        } else {
          first = false;
        }
        builder.append('"'+prop+'":');
        serializeRecurse(builder, imports, object[prop], moduleNameWithExports);
      }
    }
  }

  function serializeArray(object) {
    var first = true;
    for (var i=0; i<object.length; i++) {
      if (!first) {
        builder.append(',');
      } else {
        first = false;
      }
      serializeRecurse(builder, imports, object[i], moduleNameWithExports);
    }
  }

  function serializeNode(node) {
    // clone the node as we move it into another place to be able to convert it into
    // html
    var clone = node.cloneNode(true);
    var container = document.createElement('div');
    container.appendChild(node)
    imports['createNode'] = 'templating';
    builder.appendLine("createNode("+node.nodeType+",'"+container.innerHTML+"')");
  }
}


class Builder {
  constructor() {
    this.result = '';
  }
  appendLine(string) {
    return this.append(string+'\n');
    return this;
  }
  append(string) {
    this.result += string;
    return this
  }
}

