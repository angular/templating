export class ViewFactory {
  constructor(elements:ArrayLikeOfNodes) {
    this.elements = elements;
  }
  create() {
    return new View(this.elements);
  }
}
