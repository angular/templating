import {use, inject} from 'di/testing';
import {NodeCursor} from '../src/node_cursor';
import {STRINGIFY} from './dom_mocks';

describe('NodeCursor', () => {
  var a, b, c, d;

  beforeEach(() => {
    a = $('<a>A</a>')[0];
    b = $('<b>B</b>')[0];
    c = $('<i>C</i>')[0];
    d = $('<span></span>')[0];
    d.appendChild(a);
    d.appendChild(b);
  });


  it('should allow single level traversal', () => {
    var cursor = new NodeCursor([a, b]);

    expect(cursor.currentNode()).toEqual(a);
    expect(cursor.microNext()).toEqual(true);
    expect(cursor.currentNode()).toEqual(b);
    expect(cursor.microNext()).toEqual(false);
  });


  it('should descend and ascend', () => {
    var cursor = new NodeCursor([d, c]);

    expect(cursor.descend()).toEqual(true);
    expect(cursor.currentNode()).toEqual(a);
    expect(cursor.microNext()).toEqual(true);
    expect(cursor.currentNode()).toEqual(b);
    expect(cursor.microNext()).toEqual(false);
    cursor.ascend();
    expect(cursor.microNext()).toEqual(true);
    expect(cursor.currentNode()).toEqual(c);
    expect(cursor.microNext()).toEqual(false);
  });

  it('should descend and ascend two levels', () => {
    var l1 = $('<span></span>')[0];
    var l2 = $('<span></span>')[0];
    var e = $('<e>E</e>')[0];
    var f = $('<f>F</f>')[0];
    l1.appendChild(l2);
    l1.appendChild(f);
    l2.appendChild(e);
    var cursor = new NodeCursor([l1, c]);

    expect(cursor.descend()).toEqual(true);
    expect(cursor.currentNode()).toEqual(l2);
    expect(cursor.descend()).toEqual(true);
    expect(cursor.currentNode()).toEqual(e);
    cursor.ascend();
    expect(cursor.microNext()).toEqual(true);
    expect(cursor.currentNode()).toEqual(f);
    expect(cursor.microNext()).toEqual(false);
    cursor.ascend();
    expect(cursor.microNext()).toEqual(true);
    expect(cursor.currentNode()).toEqual(c);
    expect(cursor.microNext()).toEqual(false);
  });


  it('should create child cursor upon replace of top level', () => {
    var parentCursor = new NodeCursor([a]);
    var childCursor = parentCursor.replaceWithAnchor('child');

    expect(parentCursor.elements.length).toEqual(1);
    expect(STRINGIFY(parentCursor.elements[0])).toEqual('<!--ANCHOR: child-->');
    expect(childCursor.elements).toEqual([a]);

    var leafCursor = childCursor.replaceWithAnchor('leaf');

    expect(childCursor.elements.length).toEqual(1);
    expect(STRINGIFY(childCursor.elements[0])).toEqual('<!--ANCHOR: leaf-->');
    expect(leafCursor.elements).toEqual([a]);
  });


  it('should create child cursor upon replace of mid level', () => {
    var dom = $('<div><span>text</span></div>');
    var parentCursor = new NodeCursor(dom);
    parentCursor.descend(); // <span>

    var childCursor = parentCursor.replaceWithAnchor('child');
    expect(STRINGIFY(dom)).toEqual('[<div><!--ANCHOR: child--></div>]');

    expect(STRINGIFY(childCursor.elements[0])).toEqual('<span>text</span>');
  });

  it('should preserve the top-level elements', () => {
    var dom = $('<span>text</span>MoreText<div>other</div>');
    var parentCursor = new NodeCursor(dom);

    var childCursor = parentCursor.replaceWithAnchor('child');
    expect(STRINGIFY(dom)).toEqual('[<!--ANCHOR: child-->, MoreText, <div>other</div>]');

    expect(STRINGIFY(childCursor.elements[0])).toEqual('<span>text</span>');
  });
});

