/*
Problem to solve:
- elements in the root document are upgraded (created and attachedCallback) in the order that
  registerElement is called
- when using a tag like <polymer-element> or <ng-element> to call registerElement,
  that order depends on the html import order
- when loading additional resources like es6 modules, this order depends on the order
  of when those exports arrive
- however: custom elements would like to interact with parent elements
  and for this they need a assertion that they have been created and attached before the children

Solution:
- create a barrier that is able to wait until everything has been loaded
  and then calls registerElement in the document order of the elements
  in the root element
- automatically integate this with html imports
  (wait at least until all html imports have been loaded before flushing the barrier)
*/

// As we provide this module also in an inline version,
// we export it to the global namespace as well and
// make sure the inline version does not conflict
var global = window;
if (!global.loadBarrier) {
  global.loadBarrier = waitFor;
}
export {waitFor as loadBarrier};

var currentLoadCycle = null;
waitForInitialLoad();

function waitForInitialLoad() {
  var initialLoadWait;
  if (document.readyState !== 'complete') {
    initialLoadWait = waitFor();
    document.addEventListener('DOMContentLoaded', domReady, false);
    window.addEventListener('load', domReady, false);
  }

  function domReady() {
    if (domReady.called) {
      return;
    }
    domReady.called = true;
    var imports = [].slice.call(document.querySelectorAll('link[rel="import"]'));
    imports.forEach((link) => {
      if (!link.import) {
        link.addEventListener('load', waitFor(), false);
      }
    });
    initialLoadWait();
  }
}

// ------------------------
function waitFor() {
  var elementName, callback;
  if (arguments.length <= 1) {
    callback = arguments[0];
  } else {
    elementName = arguments[0];
    callback = arguments[1];
  }
  var loadCycle = currentLoadCycle;
  if (!loadCycle) {
    loadCycle = currentLoadCycle = {
      entries: [],
      counter: 0
    };
  }
  loadCycle.counter++;
  return done;

  function done() {
    var args = [].slice.call(arguments);
    if (!elementName) {
      if (args[0] && 'elementName' in args[0]) {
        elementName = args[0].elementName;
        args = args[0].args;
      }
    }
    if (elementName) {
      elementName = elementName.toLowerCase();
    }
    loadCycle.entries.push({
      args: args,
      elementName: elementName,
      callback: callback
    });
    loadCycle.counter--;
    if (loadCycle.counter <= 0) {
      finishedLoadCycle(loadCycle);
      currentLoadCycle = null;
    }
  }
}

function finishedLoadCycle(cycle) {
  // TODO: Have at least one setTimeout in between so that callbacks
  // that get resolved immediately also work
  var cycleEntries = cycle.entries;
  var firstElements = {};
  cycleEntries.forEach(function(cycleEntry) {
    if (cycleEntry.elementName) {
      var element = firstElements[cycleEntry.elementName];
      if (!element) {
        element = firstElements[cycleEntry.elementName] = document.querySelector(cycleEntry.elementName);
      }
      cycleEntry.firstElement = element;
    }
  });
  cycleEntries.sort(function(entry1, entry2) {
    if (entry1.firstElement && entry2.firstElement) {
      if (entry1.elementName === entry2.elementName) {
        return 0;
      }
      return entry1.firstElement.compareDocumentPosition(entry2.firstElement) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1;
    } else if (!entry1.firstElement) {
      return -1;
    } else {
      return 1;
    }
  });
  cycleEntries.forEach(function(cycleEntry) {
    if (cycleEntry.callback) {
      cycleEntry.callback.apply(window, cycleEntry.args);
    }
  });
}
