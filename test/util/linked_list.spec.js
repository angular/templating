import {use, inject} from 'di/testing';
import {LinkedList, LinkedListItem} from '../../src/util/linked_list';

describe('LinkedList', () => {
  class TestItem extends LinkedListItem {
    constructor(data) {
      this.data = data;
    }
  }

  function serialize(linkedList) {
    var res = [];
    var item = linkedList.head;
    while (item) {
      res.push(item.data);
      item = item.next;
    }
    return res.join('');
  }

  var a, b, c, d, list;

  beforeEach(inject((injector) => {
    a = new TestItem('a');
    b = new TestItem('b');
    c = new TestItem('c');
    d = new TestItem('d');
    list = new LinkedList();
  }));


  describe('append', () => {

    it('should append in empty list', () => {
      list.append(a);

      expect(serialize(list)).toEqual('a');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(a);
    });

    it('should append in non empty list', () => {
      list.append(a);
      list.append(b);

      expect(serialize(list)).toEqual('ab');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(b);
    });

  });

  describe('prepend', () => {

    it('should prepend in empty list', () => {
      list.prepend(a);

      expect(serialize(list)).toEqual('a');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(a);
    });

    it('should prepend in non empty list', () => {
      list.prepend(b);
      list.prepend(a);

      expect(serialize(list)).toEqual('ab');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(b);
    });

  });

  describe('insertBefore', () => {

    it('should insert before head', () => {
      list.append(b);
      list.insertBefore(a,b);

      expect(serialize(list)).toEqual('ab');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(b);
    });

    it('should insert before other element', () => {
      list.append(a);
      list.append(c);
      list.insertBefore(b,c);

      expect(serialize(list)).toEqual('abc');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(c);
    });

  });

  describe('insertAfter', () => {

    it('should insert after tail', () => {
      list.append(a);
      list.insertAfter(b,a);

      expect(serialize(list)).toEqual('ab');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(b);
    });

    it('should insert before other element', () => {
      list.append(a);
      list.append(c);
      list.insertAfter(b,a);

      expect(serialize(list)).toEqual('abc');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(c);
    });

  });

  describe('remove', () => {
    it('should remove the only item in a list', () => {
      list.append(a);
      list.remove(a);

      expect(serialize(list)).toEqual('');
      expect(list.head).toBe(null);
      expect(list.tail).toBe(null);
    });

    it('should remove the last item of a list', () => {
      list.append(a);
      list.append(b);
      list.remove(b);

      expect(serialize(list)).toEqual('a');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(a);
    });

    it('should remove the first item of a list', () => {
      list.append(a);
      list.append(b);
      list.remove(a);

      expect(serialize(list)).toEqual('b');
      expect(list.head).toBe(b);
      expect(list.tail).toBe(b);
    });
  });

  describe('move', () => {
    it('should switch head and tail', () => {
      list.append(b);
      list.append(a);
      list.insertBefore(a, b);

      expect(serialize(list)).toEqual('ab');
      expect(list.head).toBe(a);
      expect(list.tail).toBe(b);
    });

    it('should move an element in the list', () => {
      list.append(a);
      list.append(c);
      list.append(b);
      list.append(d);
      list.insertBefore(b,c);

      expect(serialize(list)).toEqual('abcd');
    });
  });
});
