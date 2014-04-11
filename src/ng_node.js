import {assert} from 'rtts-assert';

export class ArrayOfNgNode {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(NgNode));
  }
}

export class NgNode {
  constructor(node:Node, data:Object=null) {
    this.data = data;
    this.nativeNode = node;
    this._flushQueue = ()=>{};

    mixinPropertyProxy(this);
    if (node.style) {
      mixinStyleProxy(this);
    }
    if (node.classList) {
      mixinClassListProxy(this);
    }
    node.ngNode = this;
  }
  setFlushQueue(queueAdder) {
    this._flushQueue = queueAdder;
  }
}
mixinPropertyProxyProto(NgNode.prototype);


// --------------------- ClassListProxy ------------------
function mixinClassListProxy(ngNode) {
  ngNode.classList = new ClassListProxy(ngNode);
}

class ClassListProxy {
  constructor(ngNode) {
    this._dirty = false;
    this._ngNode = ngNode;
    this._cache = {};
    var className = ngNode.nativeNode.className || '';
    className.split(/\s*/).forEach((token) => {
      this._cache[token] = true;
    });
  }
  _set(newValue, tokens) {
    if (!this._dirty) {
      this._ngNode._flushQueue(this._flush.bind(this));
    }
    this._dirty = true;
    tokens.forEach((token) => {
      this._cache[token] = newValue;
    });
  }
  _flush() {
    var tokens = [];
    for (var prop in this._cache) {
      if (this._cache[prop]) {
        tokens.push(prop);
      }
    }
    this._ngNode.nativeNode.className = tokens.join(' ');
    this._dirty = false;
  }
  add(...tokens) {
    this._set(true, tokens);
  }
  remove(...tokens) {
    this._set(false, tokens);
  }
  contains(token:string) {
    return !!this._cache[token];
  }
  toggle(token:string, force:boolean = null) {
    var newValue;
    if (force !== null) {
      newValue = !!force;
    } else {
      newValue = !this.contains(token);
    }
    this._set(newValue, [token]);
  }
}


// --------------------- StyleProxy ------------------
function mixinStyleProxy(ngNode) {
  ngNode.style = new StyleProxy(ngNode);
}

class StyleProxy {
  constructor(ngNode) {
    this._props = {
      cache: {},
      changed: {},
      ngNode: ngNode,
      nativeObj: ngNode.nativeNode.style
    };
  }
}
(function() {
  // mixin the properties for styles.
  // Note: The style properties are the same on all elements,
  // so we can mixin them into the StyleProxy prototype!
  var accessors = {};
  var el = document.createElement('span');
  for (var prop in el.style) {
    accessors[prop] = createCachedAccessor(prop);
  }
  Object.defineProperties(StyleProxy.prototype, accessors);
})();

// --------------------- propertyProxy ------------------
function mixinPropertyProxyProto(targetProto) {
  targetProto.observeProp = function(propName, callback) {
    var listeners = this._props.changeListeners[propName];
    if (!listeners) {
      listeners = [];
      this._props.changeListeners[propName] = listeners;
    }
    listeners.push({callback: callback});
  }
  targetProto.addProperties = function(properties) {
    properties.forEach((propName) => {
      if (!(propName in this)) {
        Object.defineProperty(this, propName, createCachedAccessor(propName));
      }
    });
  }
}

function mixinPropertyProxy(ngNode) {
  var node = ngNode.nativeNode;
  var accessors = {};
  var ngApi = getNgApi(ngNode.nativeNode);
  for (var prop in ngApi) {
    accessors[prop] = createCachedAccessor(prop);
    var ngApiSpec = ngApi[prop];
    var events = ngApiSpec.events || [];
    events.forEach((eventName) => {
      node.addEventListener(eventName, ()=>{
        clearCacheAndReadFromNative(ngNode, [prop]);
      })
    });
  }
  Object.defineProperties(ngNode, accessors);
  // TODO: mixin non native methods as well!
  node.addEventListener('propchange', (e)=>{
    clearCacheAndReadFromNative(ngNode, e.properties || []);
  });
  ngNode._props = {
    cache: {},
    changed: {},
    changeListeners: {},
    ngNode: ngNode,
    nativeObj: ngNode.nativeNode
  };
}

HTMLInputElement.prototype.ngApi = {
  'value': {events: ['input', 'change', 'keypress']}
};

HTMLSelectElement.prototype.ngApi = {
  'value': {events: ['change']}
};

Text.prototype.ngApi = {
  'textContent': {}
}

function createNodePropAccessor(name) {
  var cache = createNodePropAccessor.cache = createNodePropAccessor.cache || {};
  var res = cache[name];
  if (!res) {
    res = {
      get: function() {
        return this.ngNode[name];
      },
      set: function(value) {
        this.ngNode[name] = value;
      },
      enumerable: true,
      configurable: false
    }
    cache[name] = res;
  }
  return res;
}

export function getNgApi(node:Node) {
  var nativeProps = getNativeProps(node.nodeName);
  var props = Object.getOwnPropertyNames(node);
  var res = {};
  props.forEach((propName) => {
    if (!nativeProps[propName]) {
      res[propName] = {};
    }
  });
  mergeDefinedNgApis(node, res);
  return res;
}

function mergeDefinedNgApis(proto, res) {
  if (proto === Object.prototype) {
    return res;
  }
  if (proto.hasOwnProperty('ngApi')) {
    var ngApi = proto.ngApi;
    for (var prop in ngApi) {
      res[prop] = ngApi[prop];
    }
  }
  return mergeDefinedNgApis(proto.__proto__, res);
}

function getNativeProps(tagName) {
  var tagName = tagName;
  var cache = getNativeProps.cache = getNativeProps.cache || {};
  var res = cache[tagName];
  if (!res) {
    var node;
    if (tagName === '#comment') {
      node = document.createComment('test');
    } else if (tagName === '#text') {
      node = document.createTextNode('test');
    } else {
      node = document.createElement(tagName);
    }
    res = {};
    Object.getOwnPropertyNames(node).forEach((propName) => {
      res[propName] = true;
    });
    cache[tagName] = res;
  }
  return res;
}

// ---------------------------- utils ---------
function createCachedAccessor(propName) {
  var cache = createCachedAccessor.cache = createCachedAccessor.cache || {};
  var res = cache[propName];
  if (!res) {
    res = {
      get: function() {
        return getCachedValue(this, propName);
      },
      set: function(value) {
        setCachedValue(this, propName, value);
      },
      enumerable: true,
      configurable: false
    }
    cache[propName] = res;
  }
  return res;
}

function getCachedValue(self, propName) {
  var nativeObj = self._props.nativeObj;
  if (!(propName in self._props.cache)) {
    self._props.cache[propName] = nativeObj[propName];
  }
  return self._props.cache[propName];
}

function setCachedValue(self, propName, value) {
  var nativeObj = self._props.nativeObj;
  var oldValue = getCachedValue(self, propName);
  if (oldValue === value) {
    return;
  }
  if (isEmpty(self._props.changed)) {
    self._props.ngNode._flushQueue(()=>{
      flushCachedValues(self);
    });
  }
  callChangeListeners(self, propName, value, oldValue);

  self._props.cache[propName] = value;
  self._props.changed[propName] = true;
}

function flushCachedValues(self) {
  for (var name in self._props.changed) {
    self._props.nativeObj[name] = self._props.cache[name];
  }
  self._props.changed = {};
}


function clearCacheAndReadFromNative(self, props) {
  props.forEach((prop) => {
    var oldValue = self[prop];
    delete self._props.cache[prop];
    delete self._props.changed[prop];
    // reading out the value will fill the cache again.
    var value = self[prop];
    if (value !== oldValue) {
      callChangeListeners(self, prop, value, oldValue);
    }
  });
}

function callChangeListeners(self, propName, value, oldValue) {
  var listeners = self._props.changeListeners && self._props.changeListeners[propName];
  if (!listeners) {
    return;
  }
  listeners.forEach((entry) => {
    entry.callback(value, oldValue);
  });
}

function isEmpty(obj) {
  for (var prop in obj) {
    return false;
  }
  return true;
}
