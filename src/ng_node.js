import {assert} from 'rtts-assert';

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
      accessors: {},
      notCacheable: {}
    }
    this._styles = {
      cache: {},
      changed: {},
      accessors: {},
      notCacheable: {}
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
  _setDirty() {    
    if (!this.isDirty()) {
      this._dirty = true;      
      if (this._data && this._data.view) {
        // TODO: Test this!
        this._data.view.rootView.dirtyNodes.push(this);
      }
    }
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
  clazz(classes:string, ...values) {
    if (values.length === 0) {
      this._ensureClassCache();
      return classes.split(' ').reduce((state, className) => {
        return state && !!this._classes.cache[className];
      }, true);
    } else {
      var value = values[0];
      this._ensureClassCache();
      classes.split(' ').forEach((className) => {
        this._classes.cache[className] = !!value;
        this._classes.changed[className] = true;
      });
      this._setDirty();
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
  propCacheable(name:string, cacheable = undefined) {
    if (cacheable === undefined) {
      return !this._props.notCacheable[name];
    }
    this._props.notCacheable[name] = !cacheable;
    return this;
  }
  prop(name:string, ...values) {
    return this._accessGeneric(this._node, this._props, name, values);
  }
  css(name:string, ...values) {
    return this._accessGeneric(this._node.style, this._styles, name, values);
  }
  _accessGeneric(nativeObj, localObj, name:string, values) {
    var notCacheable = localObj.notCacheable[name];
    if (values.length === 0) {
      if (notCacheable) {
        return nativeObj[name];
      }
      if (!(name in localObj.cache)) {
        localObj.cache[name] = nativeObj[name];
      }
      return localObj.cache[name];
    } else {
      var value = values[0];
      if (notCacheable) {
        nativeObj[name] = value;
        return this;
      }
      localObj.cache[name] = value;
      localObj.changed[name] = true;
      this._setDirty();
      return this;      
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
