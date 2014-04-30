// automatically fill the .moduleId property in annotations
// (mainly needed for componentDirectives)
export function installModuleAnnotator(requirejs) {
  requirejs.s.contexts._.execCb = function(name, callback, args, exports) {
    var module = callback.apply(exports, args);
    for (var prop in module) {
      setModuleIdInAnnotations(module[prop], name);
    }
    return module;
  };
}

function setModuleIdInAnnotations(object, moduleId) {
  if (object && object.annotations) {
    object.annotations.forEach((annotation) => {
      if ('moduleId' in annotation) {
        annotation.moduleId = moduleId;
      }
    });
  }
}