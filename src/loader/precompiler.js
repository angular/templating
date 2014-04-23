import {Inject} from 'di';
import {Global} from '../global';

@Inject(Global)
export function Precompile(global) {
  return precompile;

  function precompile(templateData, modules) {
    var usedModulePaths = [];

    // TODO: Check/improve the error handling,
    // as errors don't show up in the tests.
    var builder = new Builder(modules, usedModulePaths, global);
    builder.serializeRecurse(templateData);
    var serializedTemplates = builder.build();
    var serializedModulePaths = '';
    if (usedModulePaths.length) {
      serializedModulePaths = '"'+usedModulePaths.join('","')+'"';
    }

    // build result with a template string...
    return `
function createNode(innerHTML) {
  var d = document.createElement('div');
  d.innerHTML = innerHTML;
  return d;
}

export var promise = new Promise(function(resolve) {
  require([${serializedModulePaths}], function(...modules) {
    resolve(
      ${serializedTemplates}
    )
  });
});
`
  }
}

class Builder {
  constructor(modulesWithPath, usedModulePaths, global) {
    this.result = '';
    this.global = global;
    this.modulesWithPath = modulesWithPath;
    this.usedModulePaths = usedModulePaths;
  }
  serializeRecurse(object) {
    if (object && typeof object === 'object') {
      if (object.constructor === Array) {
        this._appendLine('[');
        this._serializeArray(object);
        this._appendLine(']');
      } else if (object.nodeType) {
        this._serializeNode(object);
      } else {
        this._appendLine('{');
        this._serializeDirectProps(object);
        this._appendLine('}');
      }
    } else if (typeof object === 'function') {
      // TODO(vojta): add a unit test for this
      this._appendLine(this._addTypeAndReturnRef(object));
    } else {
      this._appendLine(JSON.stringify(object));
    }
  }
  _serializeDirectProps(object) {
    var first = true;
    for (var prop in object) {
      if (object.hasOwnProperty(prop)) {
        if (!first) {
          this._append(',');
        } else {
          first = false;
        }
        this._append('"'+prop+'":');
        this.serializeRecurse(object[prop]);
      }
    }
  }
  _serializeArray(object) {
    var first = true;
    for (var i=0; i<object.length; i++) {
      if (!first) {
        this._append(',');
      } else {
        first = false;
      }
      this.serializeRecurse(object[i]);
    }
  }
  _serializeNode(node) {
    var document = this.global.document;
    var container = document.createElement('div');
    // get the nodes of the container into an array,
    // so they don't change while we append them somewhere else.
    // This is needed as e.g. a SimpleNodeContainer does not have
    // a live childNodes array, but a normal element does.
    var nodes = Array.prototype.slice.call(node.childNodes);
    nodes.forEach((node)=>{
      // clone the node as we move it into another place to be able to convert it into
      // html
      container.appendChild(document.importNode(node, true));
    });
    var html = container.innerHTML;

    this._appendLine("createNode('"+escapeHTMLAsString(html)+"')");
  }
  _findModuleExport(type) {
    var modulePath;
    var exportName;
    for (modulePath in this.modulesWithPath) {
      for (exportName in this.modulesWithPath[modulePath]) {
        if (this.modulesWithPath[modulePath][exportName] === type) {
          return {modulePath, exportName};
        }
      }
    }

    throw new Error('No module provided for type ' + type);
  }

  _addTypeAndReturnRef(type) {
    var {modulePath, exportName} = this._findModuleExport(type);
    var existingIndex = this.usedModulePaths.indexOf(modulePath);
    if (existingIndex === -1) {
      existingIndex = this.usedModulePaths.length;
      this.usedModulePaths.push(modulePath);
    }
    return 'modules['+existingIndex+']["'+exportName+'"]';
  }
  _appendLine(string) {
    this._append(string+'\n');
    return this;
  }
  _append(string) {
    this.result += string;
    return this
  }
  build(exportName) {
    return this.result;
  }
}

function escapeHTMLAsString(string) {
  return string.replace("'", '"').replace(/\n/g, '\\n');
}
