import {Inject} from 'di';
import {WatchGroup} from './watch_group';
import {AsyncTaskQueue} from './task_queue';

@Inject(WatchGroup, AsyncTaskQueue)
export function Digest(watchGroupRoot, taskQueue) {
  return function digest() {
    // TODO: Make the TTL configurable!
    var ttl = 15, watchCount = -1;
    do {
      while (taskQueue.tasks.length) {
        taskQueue.tasks.shift()();
      }

      if (ttl == 0) {
        // TODO: Add change log information to the error, see
        // https://github.com/angular/angular.dart/blob/master/lib/core/scope.dart
        throw new Error('Model did not stabilize.');
      }
      ttl--;
      watchCount = watchGroupRoot.digestOnce();
    } while (watchCount || taskQueue.tasks.length);
  }
}
