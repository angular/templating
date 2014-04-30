export function $html(es) {
  var esArr;
  if (!es) {
    return '';
  }
  if (!es.nodeName) {
    esArr = Array.prototype.slice.call(es);
  } else {
    esArr = [es];
  }
  return esArr.map((obj) => {
    if (obj instanceof Comment) {
      return `<!--${obj.nodeValue}-->`;
    } else if (obj instanceof Element) {
      return obj.outerHTML;
    } else if (obj instanceof DocumentFragment) {
      return '#document-fragment('+$html(obj.childNodes)+')';
    } else if (obj instanceof Node) {
      return obj.nodeValue;
    } else if (typeof obj === 'string') {
      return `${obj}`;
    } else if (obj && (typeof obj.length === 'number')) {
      var out = [];
      for (var i=0, ii=obj.length; i<ii; i++) {
        out.push(STRINGIFY(obj[i]));
      }
      return `[${out.join(", ")}]`;
    } else {
      return `${obj}`;
    }
  }).join('');
}

export function $(html) {
  var div = document.createElement('div');
  div.innerHTML = html;
  return div.childNodes;
}
