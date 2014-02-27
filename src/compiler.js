import {ArrayLikeOfNodes} from '../src/types';
import {DirectiveClassSet} from '../src/directive_class_set';
import {ViewFactory} from '../src/view_factory';

/*
 * Compiler walks the DOM and calls Selector.match on each node in the tree. 
 * It collects the resulting ElementBinders and stores them in tree which mimics 
 * the DOM structure for easy invocation of ElementBinder.bind on view clone. 
 * The resulting list of ElementBinders as well as the templ Node is returned as a ViewFactory.
 * 
 * Lifetime: immutable for the duration of application.
 */
export class Compiler {
  compile(nodes:ArrayLikeOfNodes, directives:DirectiveClassSet):ViewFactory {

  }
}
