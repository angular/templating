exports.shadowDomQuery = shadowDomQuery;
exports.shadowDomQueryAll = shadowDomQueryAll;

// Note: action will be serialized!
function shadowDomQuery(element, selector, action, index) {
  return browser.executeScript('return ('+exec+')('+action+', arguments[0], arguments[1], arguments[2])', element, selector, index);

  // Note: function to be serialized
  function exec(action, element, selector, index) {
    var elements = element.shadowRoot.querySelectorAll(selector);
    return action(elements[index || 0]);
  }
}

// Note: action will be serialized!
function shadowDomQueryAll(element, selector, action) {
  return browser.executeScript('return ('+exec+')('+action+', arguments[0], arguments[1], arguments[2])', element, selector);

  // Note: function to be serialized
  function exec(action, element, selector) {
    var children = element.shadowRoot.querySelectorAll(selector);
    var res = [];
    for (var i=0; i<children.length; i++) {
      res.push(action(children[i], i));
    }
    return res;
  }
}