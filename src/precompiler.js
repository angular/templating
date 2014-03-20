export function precompile(config, loder, html) {
    var data = {
      
    };
    var dependencies = [];
// ----------- generated template start    
    var res = `
import {ViewFactory, ElementBinder} from "templating/view_factory";

function createNodeContainer(html) {
  var el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

var rootBinder = new ElementBinder();
rootBinder.setLevel(0);
// TODO: use export default
export var viewFactory = new ViewFactory(
  createNodeContainer('<div></div>'), 
  [
    rootBinder
  ]
);
`;
// ----------- generated template end    
    return Promise.resolve(res);
}
