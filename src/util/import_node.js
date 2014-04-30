var nextImportId = 1;

var importParameters = {};

export function importFragment(targetDoc, fragment:DocumentFragment, parameters) {
  var hasChildElements = fragment.children.length > 0;
  var importId;
  if (hasChildElements) {
    var topLeft = findTopLeftElement(fragment.children[0]);
    importId = nextImportId++;
    topLeft.setAttribute('ng-import-id', importId);
    importParameters[importId] = parameters;
  }
  var cloned = targetDoc.importNode(fragment, true);
  if (hasChildElements) {
    delete importParameters[importId];
  }
  return cloned;
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