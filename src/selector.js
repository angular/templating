/**
 * Selector has internal data structures which allow it to efficiently match DirectiveTypes 
 * against the Element and its classes and attributes. 
 * The product of the match is ElementBinder.
 * 
 * Lifetime: immutable for the duration of application. 
 * Different injector branches may have different instance of this class.
 */
export class Selector {
	matchElement(node:HTMLElement):ElementBinder {
    // TODO
  }
  matchText(node:Text):TextBinder {
    // TODO
  }
}
