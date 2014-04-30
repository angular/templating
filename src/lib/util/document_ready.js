import {Inject} from 'di';
import {Global} from './global';

@Inject(Global)
export function DocumentReady(global) {
  return new global.Promise(ready);

  function ready(resolve, reject) {
    // Catch cases where $(document).ready() is called after the browser event has already occurred.
    // we once tried to use readyState "interactive" here, but it caused issues like the one
    // discovered by ChrisS here: http://bugs.jquery.com/ticket/12282#comment:15
    if ( global.document.readyState === "complete" ) {
      resolve(global.document);
    } else {
      // Use the handy event callback
      global.document.addEventListener( "DOMContentLoaded", completed, false );
      // A fallback to window.onload, that will always work
      global.addEventListener( "load", completed, false );
    }

    function completed() {
      global.document.removeEventListener( "DOMContentLoaded", completed, false );
      global.removeEventListener( "load", completed, false );
      resolve(global.document);
    }
  }
}