import {NodeInjector} from './di/node_injector';
import {ArrayLikeOfNodes} from './types';
import {Inject} from 'di';
import {QueryScope, QueryListener} from './annotations';

var FLUSH_REMOVE = 'remove';
var FLUSH_MOVE = 'move';

/*
 * View represents a set of nodes with configured directives.
 */
export class View {
  constructor(nodes:ArrayLikeOfNodes, injector:NodeInjector, viewPort:ViewPort) {
    super();
    this._viewPort = viewPort;
    this.injector = injector;
    // Save references to the nodes so that we can insert
    // them back into the fragment later...
    this._nodes = Array.prototype.slice.call(nodes);
    if (nodes[0].parentNode && nodes === nodes[0].parentNode.childNodes && nodes[0].parentNode.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      this._fragment = nodes[0].parentNode;
      this._nodesRemoved = true;
    } else {
      this._fragment = document.createDocumentFragment();
      this._nodesRemoved = false;
    }
    this._flushAction = null;
  }
  remove() {
    this.injector.remove();
    this._flushAction = FLUSH_REMOVE;
    this._viewPort._viewRemoved(this);
  }
  insertBeforeView(refView:View) {
    this.injector.insertBefore(refView.injector);
    this._flushAction = FLUSH_MOVE;
    this._viewPort._viewMoved(this);
  }
  insertAfterView(refView:View) {
    this.injector.insertAfter(refView.injector);
    this._flushAction = FLUSH_MOVE;
    this._viewPort._viewMoved(this);
  }
  appendTo(viewPort:ViewPort) {
    this.injector.appendTo(this._viewPort._anchorInjector);
    this._flushAction = FLUSH_MOVE;
    this._viewPort._viewMoved(this);
  }
  _removeNodesIfNeeded() {
    if (!this._nodesRemoved) {
      this._nodesRemoved = true;
      this._nodes.forEach((node) => { this._fragment.appendChild(node); });
    }
  }
  _insertAfterNode(refNode:Node) {
    this._removeNodesIfNeeded();
    var nextNode = refNode.nextSibling;
    if (!nextNode) {
      refNode.parentNode.appendChild(this._fragment);
    } else {
      refNode.parentNode.insertBefore(this._fragment, nextNode);
    }
    this._nodesRemoved = false;
  }
  _flushMoved(prevView:View) {
    if (this._flushAction !== FLUSH_MOVE) {
      return false;
    }
    this._flushAction = null;
    if (prevView) {
      this._insertAfterNode(prevView._nodes[prevView._nodes.length-1]);
    } else {
      this._insertAfterNode(this._viewPort._anchorNode);
    }
    return true;
  }
  _flushRemoved() {
    if (this._flushAction !== FLUSH_REMOVE) {
      return false;
    }
    this._flushAction = null;
    this._removeNodesIfNeeded();
    return true;
  }
}

export var FLUSH_MANY_VIEWS_CHANGED = 10;

export class ViewPort {
  constructor(anchorNode:HTMLElement, anchorInjector) {
    this._anchorNode = anchorNode;
    this._anchorInjector = anchorInjector;
    this._requiresFlush = false;
    this._removedViewCandidates = [];
    this._movedViewCandidates = [];
  }
  _viewMoved(view:View) {
    this._requiresFlush = true;
    if (this._movedViewCandidates.length < FLUSH_MANY_VIEWS_CHANGED) {
      this._movedViewCandidates.push(view);
    }
  }
  _viewRemoved(view:View) {
    this._requiresFlush = true;
    this._removedViewCandidates.push(view);
  }
  flush() {
    if (!this._requiresFlush) {
      return;
    }
    var siblingInjectors = this._anchorInjector._children;
    if (this._movedViewCandidates.length < FLUSH_MANY_VIEWS_CHANGED) {
      // For a small amount of changes...
      this._movedViewCandidates.forEach((childView) => {
        var index = siblingInjectors.indexOf(childView.injector);
        var previousInjector = siblingInjectors[index-1];
        var prevView = previousInjector ? previousInjector.get(View) : null;
        childView._flushMoved(prevView);
      });
    } else {
      // For a large amount of changes...
      var prevView = null;
      siblingInjectors.forEach((childInjector) => {
        var childView = childInjector.get(View);
        childView._flushMoved(prevView);
        prevView = childView;
      });
    }
    this._removedViewCandidates.forEach((view) => {
      view._flushRemoved();
    });

    this._requiresFlush = false;
    this._movedViewCandidates = [];
    this._removedViewCandidates = [];
  }
}

@QueryListener({role: 'domMovedAware', ordered: true})
@Inject(NodeInjector)
export function DomMovedAwareListener(rootInjector) {
  return {
    queryChanged: queryChanged,
    invoke: invoke
  };

  function queryChanged(sourceInjector, addRemove) {
    var domMovedListeners = sourceInjector._findQueryables({scope: QueryScope.DEEP, role: 'domMovedAware'});
    domMovedListeners.forEach((entry) => {
      entry.instances.forEach((instance) => {
        instance.__domMoved = addRemove === 1 || addRemove === 0;
      });
    });
  }

  function invoke() {
    // TODO: Implement this in a faster way so that we don't traverse
    // the whole injector hierarchy again.
    // Conditional queryables could help here (see below for ViewPorts that need flush)!
    var domMovedListeners = rootInjector._findQueryables({scope: QueryScope.DEEP, role: 'domMovedAware'});
    var needsDigest = false;
    domMovedListeners.forEach((entry) => {
      entry.instances.forEach((instance) => {
        if (instance.__domMoved) {
          needsDigest = needsDigest || instance.domMoved();
        }
        instance.__domMoved = false;
      });
    });
    return needsDigest;
  }
}

@QueryListener({role: 'view', ordered: true})
@Inject(NodeInjector, DomMovedAwareListener)
export function FlushViews(rootInjector, domMovedListener) {
  var scheduled = false;
  // Debug:
  // window.flushViews = invoke;
  // invoke = function() {}
  return {
    queryChanged: scheduleFlush,
    invoke: invoke
  };

  // View has been added, removed or moved
  function scheduleFlush(sourceInjector, addRemove) {
    if (!scheduled) {
      scheduled = true;
    }
  }

  /*
   * Performance properties:
   * 1. Loop in reverse depth first order,
   *    so that we do as much work as possible in detached state.
   * 2. Don't flush ViewPorts that are no longer
   *    attached to the root view (e.g. for nested repeaters where the parent repeater has already been removed)
   */
  function invoke() {
    if (!scheduled) {
      return;
    }
    scheduled = false;
    // TODO: Change query system to be able to query for a dynamically
    // changing state, i.e. only the viewPorts with _requiresFlush flag set!
    // (E.g. inject a `DynamicQueryable` object into ViewPort, which is a function that takes a boolean)
    var viewPorts = rootInjector._findQueryables({scope: QueryScope.DEEP, role: 'viewPort'});
    var i = viewPorts.length;
    while (i--) {
      viewPorts[i].instances.forEach( (viewPort) => viewPort.flush() );
    }
    return domMovedListener.invoke();
  }
}

