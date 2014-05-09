import {Inject} from 'di';

@Inject
export function Global() {
  return window;
}
