export class LinkedListItem {
  constructor() {
    this.next = null;
    this.prev = null;
  }
}

export class LinkedList {
  constructor() {
    this.tail = null;
    this.head = null;
  }

  remove(item:LinkedListItem) {
    if (item.prev) {
      item.prev.next = item.next;
    }
    if (item.next) {
      item.next.prev = item.prev;
    }
    if (item === this.tail) {
      this.tail = item.prev;
    }
    if (item === this.head) {
      this.head = item.next;
    }

    item.next = null;
    item.prev = null;
  }

  append(item:LinkedListItem) {
    this.remove(item);

    if (!this.tail) {
      // empty list
      this.tail = this.head = item;
    } else {
      this.tail.next = item;
      item.prev = this.tail;
      this.tail = item;
    }
  }

  insertBefore(item:LinkedListItem, referenceItem:LinkedListItem) {
    this.remove(item);
    if (!referenceItem.prev) {
      // insert before head
      this.head.prev = item;
      item.next = referenceItem;
      this.head = item;
    } else {
      // insert in between
      var oldPrev = referenceItem.prev;
      oldPrev.next = item;
      item.prev = oldPrev;
      item.next = referenceItem;
      referenceItem.prev = item;
    }
  }

  insertAfter(item:LinkedListItem, referenceItem:LinkedListItem) {
    if (!referenceItem.next) {
      this.append(item);
    } else {
      this.insertBefore(item, referenceItem.next);
    }
  }

  prepend(item:LinkedListItem) {
    if (this.head) {
      this.insertBefore(item, this.head);
    } else {
      this.append(item);
    }
  }
}