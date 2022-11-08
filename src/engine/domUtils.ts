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

export function elementContentSize(e: Element) : { contentWidth: number, contentHeight: number } {
  let cs = window.getComputedStyle(e);
  let result = {
    contentWidth: e.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight),
    contentHeight: e.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
  };
  return result;
}