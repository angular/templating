import {WatchParser} form '../../src/lib/watch_parser';
import {Parser} from 'expressionist';

import {
  GetterCache,
  WatchGroup,
  RootWatchGroup
} from 'watchtower';

class Logger {
  constructor() {
    this._list = [];
  }

  log(message) {
    this._list.push(message);
  }

  clear() {
    this._list.length = 0;
  }

  toArray() {
    return [].concat(this._list);
  }

  toString() {
    return `${this._list.join(";")}`;
  }
}
var context, watchGrp, parser, watchParser, logger;

describe('AST Bridge', ()=>{
  beforeEach(()=>{
    context = {};
    watchGrp = new RootWatchGroup(new GetterCache({}), null, context);
    parser = new Parser();
    watchParser = new WatchParser(parser);
    logger = new Logger();
  });

  function watch(expr, callback) {
    var watchAst = watchParser.parse(expr, []);
    watchGrp.watchExpression(watchAst, callback);    
  }

  function watchWithFilters(expr, filters, callback) {
    var watchAst = watchParser.parse(expr, filters);
    watchGrp.watchExpression(watchAst, callback);    
  }

  function detectChanges() {
    watchGrp.detectChanges();
  }

  it('should watch field', ()=>{
    context['field'] = 'Worked!';

    watch('field', (value, previous) => { logger.log([value, previous]) });
    
    expect(logger.toArray()).toEqual([]);
    detectChanges();
    expect(logger.toArray()).toEqual([['Worked!', undefined]]);
    detectChanges();
    expect(logger.toArray()).toEqual([['Worked!', undefined]]);
  });
  
  it('should watch field path', ()=> {
    context['a'] = {'b': 'AB'};
    watch('a.b', (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual(['AB']);
    context['a']['b'] = '123';
    detectChanges();
    expect(logger.toArray()).toEqual(['AB', '123']);
    context['a'] = {'b': 'XYZ'};
    detectChanges();
    expect(logger.toArray()).toEqual(['AB', '123', 'XYZ']);
  });

  it('should watch math operations', ()=> {
    context['a'] = 1;
    context['b'] = 2;
    watch('a + b + 1', (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual([4]);
    context['a'] = 3;
    detectChanges();
    expect(logger.toArray()).toEqual([4, 6]);
    context['b'] = 5;
    detectChanges();
    expect(logger.toArray()).toEqual([4, 6, 9]);
  });

  it('should watch literals', ()=> {
    context['a'] = 1;
    watch('1', (value, previous) => logger.log(value))
    watch('"str"', (value, previous) => logger.log(value))
    watch('[a, 2, 3]', (value, previous) => logger.log(value))
    watch('{a:a, b:2}', (value, previous) => logger.log(value))
    detectChanges();

    expect(logger.toArray()).toEqual([1, 'str', [1, 2, 3], {'a': 1, 'b': 2}]);
    logger.clear();
    context['a'] = 3;
    detectChanges();
    expect(logger.toArray()).toEqual([[3, 2, 3], {'a': 3, 'b': 2}]);
  });

  it('should watch nulls', ()=> {
    var r = (value, _) => logger.log(value);
    watch('null < 0',r)
    watch('null * 3', r)
    watch('null + 6', r)
    watch('5 + null', r)
    watch('null - 4', r)
    watch('3 - null', r)
    watch('null + null', r)
    watch('null - null', r)
    watch('null == null', r)
    watch('null != null', r)
    detectChanges();
    expect(logger.toArray()).toEqual([null, null, 6, 5, -4, 3, 0, 0, true, false]);
  });

  it('should invoke closures', ()=> {
    context['fn'] = ()=>{
      logger.log('fn');
      return 1;
    };
    context['a'] = {'fn': ()=>{
      logger.log('a.fn');
      return 2;
    }};
    watch('fn()', (value, previous) => { logger.log(`=> ${value}`); });
    watch('a.fn()', (value, previous) => { logger.log(`-> ${value}`); });
    detectChanges();
    expect(logger.toArray()).toEqual(['fn', 'a.fn', '=> 1', '-> 2']);
    logger.clear();
    detectChanges();
    expect(logger.toArray()).toEqual(['fn', 'a.fn']);
  });

  it('should perform conditionals', ()=> {
    context['a'] = 1;
    context['b'] = 2;
    context['c'] = 3;
    watch('a?b:c', (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual([2]);
    logger.clear();
    context['a'] = 0;
    detectChanges();
    expect(logger.toArray()).toEqual([3]);
  });


  xit('should call function', ()=> {
    context['a'] = ()=>{
      return ()=> { return 123; };
    };
    watch('a()()', (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual([123]);
    logger.clear();
    detectChanges();
    expect(logger.toArray()).toEqual([]);
  });

  it('should access bracket', ()=> {
    context['a'] = {'b': 123};
    watch('a["b"]', (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual([123]);
    logger.clear();
    detectChanges();
    expect(logger.toArray()).toEqual([]);
  });


  it('should prefix', ()=> {
    context['a'] = true;
    watch('!a', (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual([false]);
    logger.clear();
    context['a'] = false;
    detectChanges();
    expect(logger.toArray()).toEqual([true]);
  });

  it('should support filters', ()=>{
    context['a'] = 123;
    context['b'] = 2;
    
    watchWithFilters('a | multiply:b', filters,
      (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual([246]);
    logger.clear();
    detectChanges();
    expect(logger.toArray()).toEqual([]);
    logger.clear();
  });

  /* TODO: Why does this not work? */
  xit('should support arrays in filters', ()=>{
    context['a'] = [1];
    watchWithFilters('a | sort | listHead:"A" | listTail:"B"', filters,
            (value, previous) => { logger.log(value) });
    detectChanges();
    expect(logger.toArray()).toEqual(['sort', 'listHead', 'listTail', ['A', 1, 'B']]);
    logger.clear();

    detectChanges();
    expect(logger.toArray()).toEqual([]);
    logger.clear();

    context['a'].add(2);
    detectChanges();
    expect(logger.toArray()).toEqual(['sort', 'listHead', 'listTail', ['A', 1, 2, 'B']]);
    logger.clear();

    // We change the order, but sort should change it to same one and it should not
    // call subsequent filters.
    context['a'] = [2, 1];
    detectChanges();
    expect(logger.toArray()).toEqual(['sort']);
    logger.clear();
  });

  /* TODO: Why does this not work? */
  xit('should support maps in filters', ()=> {
    context['a'] = {'foo': 'bar'};
    watchWithFilters('a | identity | keys', filters, 
        (value, previous) => logger.log(value));
    detectChanges();
    expect(logger.toArray()).toEqual(['identity', 'keys', ['foo']]);
    logger.clear();

    detectChanges();
    expect(logger.toArray()).toEqual([]);
    logger.clear();

    context['a']['bar'] = 'baz';
    detectChanges();
    expect(logger.toArray()).toEqual(['identity', 'keys', ['foo', 'bar']]);
    logger.clear();
  });
});

function filters(name){
  switch(name){
    case 'identity':
      return function(input){
        logger.log(name);
        return input;
      }
    case 'keys':
      return function(input){
        logger.log(name);
        return Object.keys(input);
      }
    case 'multiply':
      return function(input, arg){
        return input * arg;
      }
    case 'listHead':
      return function(list, head){
        logger.log(name);
        return [head].concat(list);
      }
    case 'listTail':
      return function(list, tail){
        logger.log(name);
        return [].concat(list).push(tail);
      }
    case 'sort':
      return function(list){
        logger.log(name);
        var clone = [].concat(list);
        clone.sort();
        return clone;
      }
    default: throw new Error('unknown filter '+name);
  }
}
