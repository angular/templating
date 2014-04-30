import {Provide} from 'di';

export function AsyncTaskQueue() {
  schedule.tasks = [];
  return schedule;

  function schedule(task) {
    schedule.tasks.push(task);
  }
}

// Copy of https://github.com/Polymer/platform-dev/blob/master/src/microtask.js
// Should work accross platforms...
@Provide(AsyncTaskQueue)
export function CustomElementAsyncTaskQueue() {
  var iterations = 0;
  var callbacks = [];
  var twiddle = document.createTextNode('');

  new (window.MutationObserver || JsMutationObserver)(atEndOfMicrotask)
    .observe(twiddle, {characterData: true});

  return endOfMicrotask;

  function endOfMicrotask(callback) {
    twiddle.textContent = iterations++;
    callbacks.push(callback);
  }

  function atEndOfMicrotask() {
    while (callbacks.length) {
      callbacks.shift()();
    }
  }
}
