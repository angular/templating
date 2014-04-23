import {Inject} from 'di'

export function SelectorConfig() {
  return {
    interpolationRegex: /{{(.*?)}}/g,
    bindAttrRegex: /bind-(.+)/,
    eventAttrRegex: /on-(.+)/,
  };
}
