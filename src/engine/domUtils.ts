export function getElementByIdOrThrow(id: string): HTMLElement {
  let result = document.getElementById(id);
  if (!result) throw 'missing element: ' + id;
  return result;
}

export function getAttributeOrThrow(e: HTMLElement | null, key: string): string {
  if (e === null) throw 'missing element';
  let result = e.getAttribute(key);
  if (result === null) throw 'missing required attribute ' + key;
  return result;
}

function stringToFloatOr(s: string, defaultValue: number): number {
  let r = parseFloat(s);
  return Number.isNaN(r ) ? 0 : r
}

type TLRB = { left:number, top:number, right:number, bottom: number};

function elementTLRB(e: HTMLElement, prefix: string) : TLRB {
  const cs = window.getComputedStyle(e);
  const defaultValue = stringToFloatOr(cs.getPropertyValue(prefix), 0);
  return {
    left  : stringToFloatOr(cs.getPropertyValue(prefix+'Left'  ), defaultValue),
    top   : stringToFloatOr(cs.getPropertyValue(prefix+'Top'   ), defaultValue),
    right : stringToFloatOr(cs.getPropertyValue(prefix+'Right' ), defaultValue),
    bottom: stringToFloatOr(cs.getPropertyValue(prefix+'Bottom'), defaultValue),
  }
}

export function elementContentSize(e: HTMLElement) : { contentWidth: number, contentHeight: number } {
  const padding = elementTLRB(e, 'padding');
  const border = elementTLRB(e, 'border');
  return {
    contentWidth: e.offsetWidth - padding.left - border.right,
    contentHeight: e.offsetHeight - padding.top - padding.bottom,
  };
}

// https://plainjs.com/javascript/styles/get-the-position-of-an-element-relative-to-the-document-24/
export function srOffset(el: HTMLElement) {
  let rect = el.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
}
