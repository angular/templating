import {AST, ContextReferenceAST, CollectionAST, MethodAST,
        FieldReadAST, PureFunctionAST, ConstantAST} from 'watchtower';

import {CollectionChangeRecord} from 'watchtower';

import {Parser} from 'expressionist';

import {Expression,ArrayOfExpression,Chain,Filter,Assign,
        Conditional, AccessScope, AccessMember, AccessKeyed, 
        CallScope, CallFunction, CallMember, PrefixNot,
        Binary, LiteralPrimitive, LiteralArray, LiteralObject, LiteralString, Literal} from 'expressionist';

var scopeContextRef = new ContextReferenceAST();

export class WatchParser {
  constructor(parser:Parser){
    this._parser = parser;
    this._id = 0;
    this._visitor = new WatchVisitor();
  }

  parse(exp:string, filters, collection=false, context=null){
    var contextRef = this._visitor.contextRef,
        ast;

    try {
      this._visitor.filters = filters;

      if (context != null) {
        this._visitor.contextRef = new ConstantAST(context, `#${this._id++}`);
      }

      ast = this._parser.parse(exp);

      return collection ? this._visitor.visitCollection(ast) : this._visitor.visit(ast);
    } finally {
      this._visitor.contextRef = contextRef;
      this._visitor.filters = null;
    }
  }
}

class WatchVisitor {
  constructor(){
    this.contextRef = scopeContextRef;
  }

  visit(exp:Expression):AST{
    exp.accept(this);

    assert(this.ast != null);

    try {
      return this.ast;
    } finally {
      this.ast = null;
    }
  }

  visitCollection(exp:Expression):AST{
    return new CollectionAST(this.visit(exp));
  }

  visitCallScope(exp:CallScope) {
    this.ast = new MethodAST(this.contextRef, exp.name, this._toAst(exp.args));
  }

  visitCallMember(exp:CallMember) {
    this.ast = new MethodAST(this.visit(exp.object), exp.name, this._toAst(exp.args));
  }

  visitAccessScope(exp:AccessScope) {
    this.ast = new FieldReadAST(this.contextRef, exp.name);
  }

  visitAccessMember(exp:AccessMember) {
    this.ast = new FieldReadAST(this.visit(exp.object), exp.name);
  }

  visitBinary(exp:Binary) {
    this.ast = new PureFunctionAST(
      exp.operation,
      operationToFunction(exp.operation),
      [this.visit(exp.left), this.visit(exp.right)]
    );
  }

  visitPrefix(exp:PrefixNot) {
    this.ast = new PureFunctionAST(
      exp.operation,
      operationToFunction(exp.operation),
      [this.visit(exp.expression)]
    );
  }

  visitConditional(exp:Conditional) {
    this.ast = new PureFunctionAST(
      '?:', 
      operation_ternary,
      [this.visit(exp.condition), this.visit(exp.yes), this.visit(exp.no)]
    );
  }

  visitAccessKeyed(exp:AccessKeyed) {
    this.ast = new PureFunctionAST(
      '[]', 
      operation_bracket,
      [this.visit(exp.object), this.visit(exp.key)]
    );
  }

  visitLiteralPrimitive(exp:LiteralPrimitive) {
    this.ast = new ConstantAST(exp.value);
  }

  visitLiteralString(exp:LiteralString) {
    this.ast = new ConstantAST(exp.value);
  }

  visitLiteralArray(exp:LiteralArray) {
    var items = this._toAst(exp.elements);
    this.ast = new PureFunctionAST(`[${items.join(', ')}]`, arrayFn, items);
  }

  visitLiteralObject(exp:LiteralObject) {
    var keys = exp.keys;
    var values = this._toAst(exp.values),
        kv = [], 
        i, length;

    assert(keys.length == values.length);

    for (i = 0, length = keys.length; i < length; i++) {
      kv.push(`${keys[i]}: ${values[i]}`);
    }

    this.ast = new PureFunctionAST(`{${kv.join(', ')}}`, mapFn(keys), values);
  }

  visitFilter(exp:Filter) {
    var filterFunction = this.filters(exp.name);
    var args = [this.visitCollection(exp.expression)];

    args.push(...this._toAst(exp.args).map((ast) => new CollectionAST(ast)));

    this.ast = new PureFunctionAST(
      `|${exp.name}`,
      filterWrapper(filterFunction, args.length), 
      args
    );
  }

  // TODO(misko): this is a corner case. Choosing not to implement for now.
  visitCallFunction(exp:CallFunction) {
    this._notSupported("function's returning functions");
  }

  visitAssign(exp:Assign) {
    this._notSupported('assignement');
  }

  visitLiteral(exp:Literal) {
    this._notSupported('literal');
  }

  visitExpression(exp:Expression) {
    this._notSupported('?');
  }

  visitChain(exp:Chain) {
    this._notSupported(';');
  }

  _notSupported(name:string) {
    throw new Error(`Can not watch expression containing '${name}'.`);
  }

  _toAst(expressions:ArrayOfExpression){
    return expressions.map((exp) => this.visit(exp));
  }
}

//ALL CODE BELOW HAS OVERLAP WITH EXPRESSIONS

function operationToFunction(operation:string) {
  switch(operation) {
    case '!'  : return function(value) { return !value; };
    case '+'  : return function(left, right) { return autoConvertAdd(left, right); };
    case '-'  : return function(left, right) { return (left != null && right != null) ? left - right : (left != null ? left : (right != null ? 0 - right : 0)); };
    case '*'  : return function(left, right) { return (left == null || right == null) ? null : left * right; };
    case '/'  : return function(left, right) { return (left == null || right == null) ? null : left / right; };
    case '~/' : return function(left, right) { return (left == null || right == null) ? null : Math.floor(left / right); };
    case '%'  : return function(left, right) { return (left == null || right == null) ? null : left % right; };
    case '==' : return function(left, right) { return left == right; };
    case '!=' : return function(left, right) { return left != right; };
    case '<'  : return function(left, right) { return (left == null || right == null) ? null : left < right; };
    case '>'  : return function(left, right) { return (left == null || right == null) ? null : left > right; };
    case '<=' : return function(left, right) { return (left == null || right == null) ? null : left <= right; };
    case '>=' : return function(left, right) { return (left == null || right == null) ? null : left >= right; };
    case '^'  : return function(left, right) { return (left == null || right == null) ? null : left ^ right; };
    case '&'  : return function(left, right) { return (left == null || right == null) ? null : left & right; };
    case '&&' : return function(left, right) { return !!left && !!right; };
    case '||' : return function(left, right) { return !!left || !!right; };
    default: throw new Error(operation);
  }
}

function operation_ternary(condition, yes, no) { return !!condition ? yes : no; }
function operation_bracket(obj, key) { return obj == null ? null : obj[key]; }

/// Add the two arguments with automatic type conversion.
function autoConvertAdd(a, b) {
  if (a != null && b != null) {
    // TODO(deboer): Support others.
    if (typeof a == 'string' && typeof b != 'string') {
      return a + b.toString();
    }

    if (typeof a != 'string' && typeof b == 'string') {
      return a.toString() + b;
    }

    return a + b;
  }

  if (a != null) {
    return a;
  }

  if (b != null) {
    return b;
  }

  return 0;
}

// TODO(misko): figure out why do we need to make a copy?
function arrayFn(...existing){
  return existing;
}

// TODO(misko): figure out why do we need to make a copy instead of reusing instance?
function mapFn(keys){
  return function(...values){
    assert(values.length == keys.length);

    var instance = {},
        length = keys.length,
        i;

    for(i = 0; i < length; i++){
      instance[keys[i]] = values[i];
    }

    return instance;
  }
}

function filterWrapper(filterFn, length) {
  var args = [],
      argsWatches = [];

  return function(...values){
    for (var i = 0, length = values.length; i < length; i++) {
      var value = values[i];
      var lastValue = args[i];

      if (value !== lastValue) {
       if (value instanceof CollectionChangeRecord) {
         args[i] = value.iterable;
       } else {
         args[i] = value;
       }
      }
    }
    var value = filterFn(...args);

    //TODO: Is this an optimization we can make?
    //if (value is Iterable) {
      // Since filters are pure we can guarantee that this well never change.
      // By wrapping in UnmodifiableListView we can hint to the dirty checker
      // and short circuit the iterator.
      // value = new UnmodifiableListView(value);
    //}

    return value;
  }
}

function assert(condition, message) {
  if (!condition) {
    throw message || "Assertion failed";
  }
}
