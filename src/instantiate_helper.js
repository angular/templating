export function createObject(type, data) {  
  var res = Object.create(type.prototype, {});
  for (var prop in data) {
    res[prop] = data[prop];
  }
  return res;
}

export function createNode(nodeType, html) {
  var el = document.createElement('div');
  el.innerHTML = html;
  var res;
  if (nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
    res = document.createDocumentFragment();
    while (el.childNodes.length) {
      res.appendChild(el.firstChild);
    }
  } else {
    res = el.childNodes[0];
  }
  return res;
}
