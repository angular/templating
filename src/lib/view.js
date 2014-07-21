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
      return;
    }
    this._flushAction = null;
    if (prevView) {
      this._insertAfterNode(prevView._nodes[prevView._nodes.length-1]);
    } else {
      this._insertAfterNode(this._viewPort._anchorNode);
    }
  }
  _flushRemoved() {
    if (this._flushAction !== FLUSH_REMOVE) {
      return;
    }
    this._flushAction = null;
    this._removeNodesIfNeeded();
  }
}

export class ViewPort {
  constructor(anchorNode:HTMLElement, anchorInjector) {
    this._anchorNode = anchorNode;
    this._anchorInjector = anchorInjector;
    this._requiresFlush = false;
    this._removedViewCandidates = [];
  }
  _viewMoved(view:View) {
    // TODO: view parameter needed or optimized version for less than 5 changed nodes,
    // see comment below
    // TODO: implement optimized version
    this._requiresFlush = true;
  }
  _viewRemoved(view:View) {
    this._requiresFlush = true;
    this._removedViewCandidates.push(view);
  }
  flush() {
    if (!this._requiresFlush) {
      return;
    }
    this._requiresFlush = false;
    // Note on performance:
    // This loop is good when many sibling views are added at the same time.
    // It's not so good when individual views are added/removed, in which case
    // saving the individual views and using indexOf to get the previous view would be faster.
    // TODO: implement both strategies here:
    // - while only up to 5 views are added/removed, use the
    //   indexOf approach
    // - if more than 5 views are added/removed, use the current approach
    //   of looping over all of the child views
    var prevView = null;
    this._anchorInjector._children.forEach((childInjector) => {
      var childView = childInjector.get(View);
      childView._flushMoved(prevView);
      prevView = childView;
    });
    this._removedViewCandidates.forEach((view) => {
      view._flushRemoved();
    });
    this._removedViewCandidates = [];
  }
}

@QueryListener({role: 'view', ordered: true})
@Inject(NodeInjector)
export function FlushViews(rootInjector) {
  var scheduled = false;
  return {
    queryChanged: scheduleFlush
  };

  // View has been added, removed or moved
  function scheduleFlush(sourceInjector, addRemove) {
    if (!scheduled) {
      scheduled = true;
      window.requestAnimationFrame(flush);
      // Debug: window.flushViews = flush;
    }
  }

  function flush() {
    scheduled = false;
    // TODO: Change query system to be able to query for a dynamically
    // changing state, i.e. the viewPorts with _requiresFlush flag set!
    var viewPorts = rootInjector._findQueryables({scope: QueryScope.DEEP, role: 'viewPort'});
    // Loop in reverse depth first order,
    // so that we do as much work as possible in detached state.
    // Note: Don't flush viewPorts that are no longer
    // attached to the root view as this can be done later
    // when they are attached again.
    var i = viewPorts.length;
    while (i--) {
      viewPorts[i].instances.forEach( (viewPort) => viewPort.flush() );
    }
  }
}

