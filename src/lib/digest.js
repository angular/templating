import {Inject} from 'di';
import {WatchGroup} from './watch_group';
import {AsyncTaskQueue} from './task_queue';
import {FlushViews} from './view';

@Inject(WatchGroup, AsyncTaskQueue, FlushViews)
export function Digest(watchGroupRoot, taskQueue, flushViews) {
  return function digest() {
    do {
      execDigest();
      // TODO: For now we execute flushViews in sync with digest and not in a requestAnimationFrame,
      // so that we don't skip frames if a DomMovedAware listener requests another digest.
      // In the future we want to detect those situations, process flush in requestAnimationFrame
      // by default and only in sync when we detect those situations.
    } while (flushViews.invoke());
  }

  function execDigest() {
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
