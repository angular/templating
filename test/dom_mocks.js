export function STRINGIFY(obj) {
  if (obj instanceof Comment) {
    return `<!--${obj.nodeValue}-->`;
  } else if (obj instanceof Element) {
    return obj.outerHTML;
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
}