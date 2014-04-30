import {Injector, Provide, TransientScope, Inject} from 'di';
import {Queryable, QueryListener, QueryScope, ImplicitScope} from '../annotations';
import {valueProvider, getAnnotation} from '../util/misc';

var nextId = 0;

export class NodeInjector {
  static get(node) {
    return node.ngInjector;
  }
  static find(node) {
    while (node) {
      var injector = NodeInjector.get(node);
      if (injector) {
        return injector;
      }
      node = node.parentNode || node.host;
    }
    return null;
  }
  constructor({node, providers = [], root = null, isShadowRoot = false, parent = null} = {}) {
    if (node) {
      if (node.ngInjector) {
        throw new Error('There can only be one NodeInjector per node: '+node);
      }
      node.ngInjector = this;
    }
    this._id = ''+(nextId++);
    this._node = node;

    this._children = [];
    this._root = root;
    this._isShadowRoot = isShadowRoot;

    this._queries = {};
    this._queryables = {};
    this._subtreeQueryables = {};

    this._createDelegate(
      [valueProvider(Node, node), valueProvider(NodeInjector, this), ...providers],
      parent ? parent._delegate : null
    );
    // parent stays null until this node injector is attached to someone else
    this._parent = null;
  }
  createChild({node, providers, isShadowRoot = false}) {
    return new NodeInjector({node, providers, root:this._root, isShadowRoot, parent: this});
  }
  _createDelegate(providers, parent) {
    var self = this;
    // Note: Don't call injector.createChild as it puts the providers from the parent injector
    // into this injector as well (the ones with TransientScope or ImplicitScope),
    // and then our loop below loops over too much!
    // TODO: Use a better integration with DI...
    this._delegate = new Injector(providers, parent, new Map(), [TransientScope, ImplicitScope]);
    this._delegate._providers.forEach((provider, token) => {
      searchAndAddAnnotations(provider.provider, token);
      // Look into the params as well, as they might contain a token annotated
      // with @ImplicitScope (used for @InjectQuery)
      provider.params.forEach((param) => {
        if (typeof param.token === 'function' && getAnnotation(param.token, ImplicitScope)) {
          searchAndAddAnnotations(null, param.token);
        }
      });
    });

    function searchAndAddAnnotations(provider, token) {
      var source = provider && provider !== token ? provider : token;
      if (!source.annotations) {
        return;
      }
      source.annotations.forEach((annotation) => {
        if (annotation instanceof Queryable) {
          addQueryable(annotation.role, self._delegate.get(token));
        } else if (annotation instanceof QueryListener) {
          addQueryListener(annotation, self._delegate.get(token));
        }
      });
    }

    function addQueryable(role, instance) {
      var entry = self._queryables[role];
      if (!entry) {
        entry = self._queryables[role] = [];
        self._subtreeQueryables[role] = 0;
      }
      entry.push(instance);
      self._subtreeQueryables[role]++;
    }

    function addQueryListener({role, ordered}, callback) {
      var query = self._queries[role] = {
        role: role,
        ordered
      };
      query.changed = function(sourceInjector, incDec) {
        callback.queryChanged(sourceInjector, incDec);
      };
    }
  }
  insertBefore(ref:NodeInjector) {
    this._insert(ref._parent, ref._parent._children.indexOf(ref));
  }
  insertAfter(ref:NodeInjector) {
    this._insert(ref._parent, ref._parent._children.indexOf(ref)+1);
  }
  appendTo(parent:NodeInjector) {
    this._insert(parent, parent._children.length);
  }
  nodeMoved(parentChanged:boolean) {
    var parent = this._parent;
    if (parentChanged) {
      parent = NodeInjector.find(this._node.parentNode);
    }
    // TODO: do a insertion sort (performance)
    for (var i=0; i<parent._children.length; i++) {
      var child = parent._children[i];
      if (this._node.compareDocumentPosition(child._node) & Node.DOCUMENT_POSITION_FOLLOWING) {
        break;
      }
    }
    this._insert(parent, i);
  }
  remove() {
    if (!this._parent) {
      return;
    }
    this._adjustQueryablesInParents(-1);
    var index = this._parent._children.indexOf(this);
    this._parent._children.splice(index, 1);
    this._parent = null;
  }
  get(token) {
    return this._delegate.get(token);
  }
  _insert(parent, index) {
    if (parent === this._parent) {
      // move within the same parent
      var oldIndex = parent._children.indexOf(this);
      if (oldIndex !== -1) {
        parent._children.splice(oldIndex, 1);
      }
      parent._children.splice(index, 0, this);
      this._adjustQueryablesInParents(0);
    } else {
      // new parent
      this.remove();
      this._parent = parent;
      this._cloneDelegateWithNewParent();

      parent._children.splice(index, 0, this);
      this._adjustQueryablesInParents(1);
    }
  }
  _cloneDelegateWithNewParent() {
    if (this._delegate._parent === this._parent._delegate) {
      return;
    }
    var source = this._delegate;
    var clone = Object.create(Injector.prototype);
    clone._cache = source._cache;
    clone._providers = source._providers;
    clone._scopes = source._scopes;
    clone._parent = this._parent._delegate;
    this._delegate = clone;
    this._children.forEach((childInjector) => {
      childInjector._cloneDelegateWithNewParent();
    });
    return clone;
  }
  _adjustQueryablesInParents(inc, roles = null) {
    if (!roles) {
      roles = this._subtreeQueryables;
    }
    var parent = this;
    while (parent) {
      for (var role in this._subtreeQueryables) {
        if (inc) {
          var counter = parent._subtreeQueryables[role] || 0;
          parent._subtreeQueryables[role] = counter+inc;
        }
        var query = parent._queries[role];
        if (query) {
          query.changed(this, inc);
        }
      }
      parent = parent._parent;
    }
  }
  _findQueryables({role, scope = QueryScope.DEEP, result = []}) {
    if (scope === QueryScope.THIS || scope === QueryScope.LIGHT || scope === QueryScope.DEEP) {
      var instances = this._queryables[role];
      if (instances) {
        result.push({
          injector: this,
          instances: instances
        });
      }
    }
    this._children.forEach((child) => {
      if (!child._subtreeQueryables[role]) {
        return;
      }
      var recurse = false;
      var recurseScope = scope;
      if (child._isShadowRoot) {
        if (scope === QueryScope.SHADOW || scope === QueryScope.DEEP) {
          recurse = true;
          if (scope === QueryScope.SHADOW) {
            recurseScope = QueryScope.LIGHT;
          }
        }
      } else if (scope === QueryScope.LIGHT || scope === QueryScope.DEEP) {
        recurse = true;
      }
      if (recurse) {
        child._findQueryables({role, scope:recurseScope, result});
      }
    });
    return result;
  }
}

export class RootInjector extends NodeInjector {
  constructor({node, providers = []} = {}) {
    // TODO: Don't provide the RootInjector to the injector and
    // change all references to just use NodeInjector
    providers = [valueProvider(RootInjector, this)].concat(providers);
    super({node, providers, root:this});
    this._adjustQueryablesInParents(1);
  }
}
