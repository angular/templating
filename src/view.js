import {NodeContainer} from './node_container';
import {LinkedList} from './linked_list';
import {LinkedListItem} from './linked_list';
import {Injector} from 'di';

import {WatchParser, Parser} from 'expressionist';
import {Parser} from 'expressionist';

import { GetterCache, DirtyCheckingChangeDetector } from 'watchtower';
import { WatchGroup, RootWatchGroup} from 'watchtower';
import { NgNode, ArrayOfNgNode } from './ng_node';

/*
 * View represents a DOM with bound Directives. 
 * Views are added to the ViewPort by the template directives 
 * such as ng-if and ng-repeat.
 */
export class View extends LinkedListItem {
  constructor(parentView:View, container:NodeContainer, injector:Injector, executionContext:Object = {}) {
    super();
    this.injector = injector;
    this.parentView = parentView;
    this.executionContext = executionContext;
    if (this.parentView) {
      this.rootView = this.parentView.rootView;
      this.watchGrp = this.parentView.watchGrp.newGroup(this.executionContext);
    } else {
      this.rootView = this;
      // TODO: Refactor this setup, use DI
      this.detector = new DirtyCheckingChangeDetector(new GetterCache({}));
      this.watchGrp = new RootWatchGroup(this.detector, this.executionContext);
    }
    this.parser = injector.get(Parser);
    this.watchParser = injector.get(WatchParser);
    // Save references to the nodes so that we can insert
    // them back into the fragment later...
    this.nodes = Array.prototype.slice.call(container.childNodes);
    if (container.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
      this._fragment = container;
      this.removed = true;
    } else {
      this._fragment = document.createDocumentFragment();
      this.removed = false;
    }
  }
  _removeIfNeeded() {
    this._checkDestroyed();
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
    this._checkDestroyed();
    // TODO: How to get the filters??
    // -> they should be defined in the modules that the template
    //    imports resp. in the data that is given to compile()!
    var filters = null;
    // TODO: Cache expressions
    // -> can't cache the watchAst, but
    //    we could cache the expression AST, then change watchParser to
    //    get the expression AST as an input, and not the expression string!
    var watchAst = this.watchParser.parse(expression, filters, false, context);
    this.watchGrp.watch(watchAst, callback);
  }
  assign(expression:string, value=null, context:Object=null) {
    this._checkDestroyed();
    // TODO: Cache the expressions!
    var parsedExpr = this.parser.parse(expression);
    parsedExpr.bind(context || this.executionContext).assign(value);
  }
  evaluate(expression:string, context:Object=null) {
    this._checkDestroyed();
    // TODO: Cache the expressions!
    var parsedExpr = this.parser.parse(expression);
    return parsedExpr.bind(context || this.executionContext).eval();
  }
  destroy() {
    if (this.rootView !== this) {
      this.watchGrp.remove();
    }
    this.destroyed = true;
  }
  _checkDestroyed() {
    if (this.destroyed) {
      throw new Error('This view has been destroyed and can not be used any more');
    }
  }
}

export class RootView extends View {
  constructor(container:NodeContainer, injector:Injector, executionContext:Object = {}) {
    super(null, container, injector, executionContext);
    this.dirtyNodes = [];
  }
  digest() {
    this.watchGrp.detectChanges();
    while (this.dirtyNodes.length) {
      this.dirtyNodes.pop().flush();
    }
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
  remove(view:View) {
    this.list.remove(view);
    view._removeIfNeeded();
  }
}
