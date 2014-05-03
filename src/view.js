import {NodeContainer} from './types';
import {LinkedList, LinkedListItem} from './util/linked_list';
import {Injector} from 'di';

import {WatchParser, Parser} from 'expressionist';
import {Parser} from 'expressionist';

import { GetterCache, DirtyCheckingChangeDetector } from 'watchtower';
import { WatchGroup, RootWatchGroup} from 'watchtower';

import { NodeAwareChangeNotifier } from './change_notifier';

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
    this.attachedCallbacks = [];
    this.detachedCallbacks = [];
    this.executionContext = executionContext;
    if (this.parentView) {
      this.rootView = this.parentView.rootView;
      this.watchGrp = this.parentView.watchGrp.newGroup(this.executionContext);
    } else {
      this.rootView = this;
      this.changeNotifier = injector.get(NodeAwareChangeNotifier);
      // TODO: Refactor this setup, use DI
      this.detector = new DirtyCheckingChangeDetector(new GetterCache({}), this.changeNotifier);
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
      this._detached();
    }
  }
  _attached() {
    this.attachedCallbacks.forEach((callback) => callback());
    // TODO: resume the WatchGroup
  }
  _detached() {
    this.detachedCallbacks.forEach((callback) => callback());
    // TODO: suspend the WatchGroup
  }
  insertBefore(refNode:Node) {
    var parent = refNode.parentNode;
    this._removeIfNeeded();
    parent.insertBefore(this._fragment, refNode);
    this.removed = false;
    this._attached();
  }
  appendTo(node:Node) {
    this._removeIfNeeded();
    node.appendChild(this._fragment);
    this.removed = false;
    this._attached();
  }
  notifyChange(obj) {
    this.rootView.notifyChange(obj);
  }
  // TODO: Cannot mix destrucuring arguments with types
  watch({expression, callback, context=null, collection = false}) {
    this._checkDestroyed();
    context = context || this.executionContext;
    // TODO: How to get the filters??
    // -> they should be defined in the modules that the template
    //    imports resp. in the data that is given to compile()!
    var filters = null;
    var watchAst = this.watchParser.parse(expression, filters, collection, context);
    this.watchGrp.watch(watchAst, callback);
  }
  // TODO: Maybe change interface in view: merge evaluate, assign into one function
  // that returns an object that only has the assign method if the expression is assignable
  // TODO: Cannot mix destrucuring arguments with types
  assign({expression, value, context=null, notify=false}) {
    this._checkDestroyed();
    context = context || this.executionContext;
    var parsedExpr = this.parser.parse(expression);
    parsedExpr.bind(context).assign(value);
    if (notify) {
      var object;
      if (parsedExpr.object) {
        object = parsedExpr.object.bind(context).eval();
      } else {
        object = context;
      }
      this.notifyChange(object);
    }
  }
  isAssignable(expression:string) {
    var parsedExpr = this.parser.parse(expression);
    return !!parsedExpr.isAssignable;
  }
  evaluate(expression:string, context:Object=null) {
    this._checkDestroyed();
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
    this.flushQueue = [];
  }
  notifyChange(object) {
    this.changeNotifier.notify(object);
  }
  digest() {
    // TODO: Make the TTL configurable!
    var ttl = 5, count;
    var debug = false;
    do {
      if (ttl == 0) {
        // TODO: Add change log information to the error, see
        // https://github.com/angular/angular.dart/blob/master/lib/core/scope.dart
        throw new Error('Model did not stabilize.');
      }
      ttl--;
      if (debug) {
        console.log('start digest loop');
      }
      count = this.watchGrp.detectChanges(null, function() {
        if (debug) {
          console.log('...', arguments);
        }
      });
      if (debug) {
        console.log('end digest loop');
      }
    } while (count);

    while (this.flushQueue.length) {
      this.flushQueue.pop()();
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
