import {assert} from 'assert';

export class ArrayOfNgNode {
  static assert(obj) {
    assert(obj).is(assert.arrayOf(NgNode));
  }
}

export class NgNode {
  constructor(node:Node, data:Object=null) {
    node.ngNode = this;
    this._node = node;
    this._data = data;
    this._dirty = false;
    this._classes = {
      cache: null,
      changed: {},
      accessors: {}
    };
    this._props = {
      cache: {},
      changed: {},
      accessors: {}
    }
    this._styles = {
      cache: {},
      changed: {},
      accessors: {}
    }
    this._installPropertyChangeEventListeners();
  }
  _installPropertyChangeEventListeners() {
    var self = this;
    this._node.addEventListener('propchange', (e)=>{
      clearCache(e.properties || []);
    });

    if (this._node.nodeName === 'INPUT') {
      var listener = createClearCacheListener(['value']);
      this._node.addEventListener('input', listener);
      this._node.addEventListener('change', listener);
      this._node.addEventListener('keypress', listener);
    } else if (this._node.nodeName === 'SELECT') {
      var listener = createClearCacheListener(['value']);
      this._node.addEventListener('change', listener);      
    } else if (this._node.nodeName === 'OPTION') {
      var listener = createClearCacheListener(['selected']);
      this._node.parentNode.addEventListener('change', listener);
    }

    function createClearCacheListener(props) {
      return () => { clearCache(props); };
    }

    function clearCache(props) {
      props.forEach((prop) => {
        delete self._props.cache[prop];
        delete self._props.changed[prop];
      });
    }
  }
  nativeNode() {
    return this._node;
  }
  data() {
    return this._data;
  }
  isDirty() {
    return this._dirty;
  }
  flush() {
    this._dirty = false;

    var changedClasses = this._flushClasses();
    var changedProps = this._flushGeneric(this._node, this._props);
    var changedStyles = this._flushGeneric(this._node.style, this._styles);
    return {
      classes: changedClasses,
      props: changedProps,
      styles: changedStyles
    }
  }
  clazz(classes:string) {
    var self = this;
    var accessor = self._classes.accessors[classes];
    if (!accessor) {
      accessor = Object.create({}, {
        value: {
          get: get,
          set: set
        }
      });
      self._classes.accessors[classes] = accessor;
    }
    return accessor;

    function get() {
      self._ensureClassCache();
      return classes.split(' ').reduce((state, className) => {
        return state && !!self._classes.cache[className];
      }, true);
    }

    function set(condition) {
      self._ensureClassCache();
      classes.split(' ').forEach((className) => {
        self._classes.cache[className] = !!condition;
        self._classes.changed[className] = true;
      });
      self._dirty = true;
      return this;
    }
  }
  _ensureClassCache() {
    if (!this._classes.cache) {
      var cache = this._classes.cache = {};
      (this._node.className||'').split(/\s*/).forEach((className) => {
        cache[className] = true;
      });
    }
  }
  _flushClasses() {
    var changedValues = {}
    var nativeClasses = [];
    var changed = false;    
    for (var name in this._classes.cache) {
      var value = this._classes.cache[name];
      if (this._classes.changed[name]) {
        changed = true;
        changedValues[name] = value;
      }
      nativeClasses.push(name);
    }
    this._classes.changed = {};
    if (changed) {
      this._node.className = nativeClasses.join(' ');
    }
    return changedValues;
  }
  prop(name:string, value:string = null) {
    return this._accessGeneric(this._node, this._props, name, value);
  }
  css(name:string, value = null) {
    return this._accessGeneric(this._node.style, this._styles, name, value);
  }
  _accessGeneric(nativeObj, localObj, name:string) {
    var self = this;
    var accessor = localObj.accessors[name];
    if (!accessor) {
      accessor = Object.create({}, {
        value: {
          get: get,
          set: set
        }
      });
      localObj.accessors[name] = accessor;
    }
    return accessor;

    function set(value) {
      localObj.cache[name] = value;
      localObj.changed[name] = true;
      self._dirty = true;
      return self;
    }

    function get() {
      if (!(name in localObj.cache)) {
        localObj.cache[name] = nativeObj[name];
      }
      return localObj.cache[name];          
    }
  }
  _flushGeneric(nativeObj, localObj) {
    var changedValues = {};
    for (var name in localObj.changed) {
      nativeObj[name] = localObj.cache[name];
      changedValues[name] = localObj.cache[name];
    }
    localObj.changed = {};
    return changedValues;
  }
}
