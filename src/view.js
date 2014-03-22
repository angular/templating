import {NodeContainer} from './node_container';
import {LinkedList} from './linked_list';
import {LinkedListItem} from './linked_list';
import {Injector} from 'di/injector';

import {WatchParser, Parser} from 'expressionist/watch_parser';
import {Parser} from 'expressionist/parser';

import { GetterCache, DirtyCheckingChangeDetector } from 'watchtower/dirty_checking';
import { WatchGroup, RootWatchGroup} from 'watchtower/watch_group';
import { NgNode, ArrayOfNgNode } from './ng_node';

/*
 * View represents a DOM with bound Directives. 
 * Views are added to the ViewPort by the template directives 
 * such as ng-if and ng-repeat.
 */
export class View extends LinkedListItem {
  constructor(container:NodeContainer, injector:Injector, executionContext:Object = {}, ngNodes:ArrayOfNgNode = []) {
    super();
    this.injector = injector;
    this.executionContext = executionContext;
    // Save references to the nodes so that we can insert
    // them back into the fragment later...
    // TODO: rename this? it's only the parent nodes, but the ngNodes are all 
    // nodes that have bindings in this view!
    this.nodes = Array.prototype.slice.call(container.childNodes);
    this.ngNodes = ngNodes;
    if (container.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      this._fragment = container;
      this.removed = true;
    } else {
      this._fragment = new DocumentFragment();
      this.removed = false;
    }
    // TODO: Refactor this setup, use DI
    // TODO: Don't create a RootWatchGroup every time,
    // but use the parent view's watchGroup
    // -> refactor view to require a parent view as input
    // ?? Maybe create a RootView ??
    // -> would always be inplace...
    this.detector = new DirtyCheckingChangeDetector(new GetterCache({}));
    this.watchGrp = new RootWatchGroup(this.detector, this.executionContext);
    this.parser = new Parser();
    this.watchParser = new WatchParser(this.parser);
  }
  _removeIfNeeded() {
    if (!this.removed) {
      this.removed = true;
      this.nodes.forEach((node) => { this._fragment.appendChild(node); });
    }
  }
  insertBefore(refNode:Node) {
    var parent = refNode.parentNode;
    this._removeIfNeeded();
    parent.insertBefore(this._fragment, refNode);
    this.removed = false;
  }
  appendTo(node:Node) {
    this._removeIfNeeded();
    node.appendChild(this._fragment);
    this.removed = false;
  }
  watch(expression:string, callback:Function, context:Object=null) {
    // TODO: How to get the filters??
    // -> they should be defined in the modules that the template
    //    imports resp. in the data that is given to compile()!
    // -> it would be optimal if we could precompile the expressions,
    //    as through this we would know which filters are used and which are not!
    var watchGrp = this.watchGrp;
    if (context && context !== this.executionContext) {
      // TODO: How to clean up this new watchGrp??
      watchGrp = this.watchGrp.newGroup(context);
    }
    var filters = function(){};
    // TODO: Cache expressions
    var watchAst = this.watchParser.parse(expression, filters);
    watchGrp.watch(watchAst, callback);
  }
  assign(expression:string, value=null, context:Object=null) {
    // TODO: Cache the expressions!
    var parsedExpr = this.parser.parse(expression);
    parsedExpr.bind(context || this.executionContext).assign(value);
  }
  evaluate(expression:string, context:Object=null) {
    // TODO: Cache the expressions!
    var parsedExpr = this.parser.parse(expression);
    return parsedExpr.bind(context || this.executionContext).eval();
  }
  digest() {
    this.watchGrp.detectChanges();
    // TODO: Call child views as well
  }
  flush() {
    this.ngNodes.forEach((ngNode) => { ngNode.flush(); });
    // TODO: Call child views as well
  }
}

export class ViewPort  {
  constructor(anchor:Comment) {
    this.anchor = anchor;
    this.list = new LinkedList();
  }
  append(view:View) {
    view.insertBefore(this.anchor);
    this.list.append(view);
  }
  insertBefore(view:View, referenceView:View) {
    view.insertBefore(referenceView.nodes[0]);
    this.list.insertBefore(view, referenceView);
  }
  prepend(view:View) {
    if (this.list.head) {
      this.insertBefore(view, this.list.head);
    } else {
      this.append(view);
    }
  }
  insertAfter(view:View, referenceView:View) {
    if (!referenceView.next) {
      this.append(view);
    } else {
      this.insertBefore(view, referenceView.next);
    }
  }

  // TODO: destroy the injector of the view as well here
  // TODO: Provide a hook for DI objects (e.g. event_handler)
  // to be notified about the destruction of the injector.
  remove(view:View) {
    this.list.remove(view);
    view._removeIfNeeded();
  }
}
