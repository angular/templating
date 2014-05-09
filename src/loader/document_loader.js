import {Inject} from 'di';

@Inject
export function DocumentLoader() {
  throw new Error('Abstract function');
}

