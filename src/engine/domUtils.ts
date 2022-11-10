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

function stringToFloatOrZero(s: string){
  let r = parseFloat(s);
  return Number.isNaN(r ) ? 0 : r
}

export function elementContentSize(e: Element) : { contentWidth: number, contentHeight: number } {
  let cs = window.getComputedStyle(e);
  let paddingLeft = cs.getPropertyValue('paddingLeft');
  let paddingRight = cs.getPropertyValue('paddingRight');
  let paddingTop = cs.getPropertyValue('paddingTop');
  let paddingBottom = cs.getPropertyValue('paddingBottom');
  if (e.clientWidth === 0){
    console.log('clientWidth is zero', e);
  }
  return {
    contentWidth: e.clientWidth - stringToFloatOrZero(paddingLeft) - stringToFloatOrZero(paddingRight),
    contentHeight: e.clientHeight - stringToFloatOrZero(paddingTop) - stringToFloatOrZero(paddingBottom)
  };
}

// https://plainjs.com/javascript/styles/get-the-position-of-an-element-relative-to-the-document-24/
export function srOffset(el: HTMLElement) {
  let rect = el.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;
  return { top: rect.top + scrollTop, left: rect.left + scrollLeft }
}
