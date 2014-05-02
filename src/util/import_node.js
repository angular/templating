var nextImportId = 1;
var importParameters = {};

/*
 * imports the given fragment and provides parameters for custom elements
 * that are contained in the fragment. The custom elements can read out the
 * parameters via the #getImportParameters in their createdCallback method.
 */
export function ImportFragment() {
  return function importFragment(fragment:DocumentFragment, parameters) {
    var hasChildElements = fragment.children.length > 0;
    var importId;
    if (hasChildElements) {
      var topLeft = findTopLeftElement(fragment.children[0]);
      importId = nextImportId++;
      topLeft.setAttribute('ng-import-id', importId);
      importParameters[importId] = parameters;
    }
    var cloned = document.importNode(fragment, true);
    if (hasChildElements) {
      delete importParameters[importId];
    }
    return cloned;
  }

  // TODO: Add createElement(elementName, parameters) as well!
  // -> rename ImportFragment for this!
}

export function getImportParameters(element:HTMLElement) {
  var topLeft = findTopLeftElement(element);
  return importParameters[element.getAttribute('ng-import-id')];
}

function findTopLeftElement(node) {
  while (node.parentNode && node.parentNode.nodeType === Node.ELEMENT_NODE) {
    node = node.parentNode;
  }
  while (node.previousElementSibling) {
    node = node.previousElementSibling;
  }
  return node;
}
