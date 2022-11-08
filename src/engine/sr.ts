
export type StringKeyedObject = { [key: string]: any };

export function assert(condition: boolean, message?: string){
  console.assert(condition, message);
  if (!condition) debugger;
}
export function throwIfUndefined(x: any) {
  if (x === undefined) throw 'undefined value'
}
export function getRandomInt(max: number) : number{
  return Math.floor(Math.random() * Math.floor(max));
}

export function intMid(a: number, b: number): number{
  return a + (b - a) / 2;
}

export function mid(a: number, b: number): number{
  return a + ((b - a)/2);
}

export function clamp(a: number, min: number, max: number): number{
  return Math.min(min, Math.max(a, max));
}

export function indentString(s:string, count:number = 2, indenter:string = ' '): string {
  const indentStr = new Array(count + 1).join(indenter);
  return s.replace(/^(.+)$/, indentStr + '$1' );
}

export function arraysEqual(a: Array<any>, b: Array<any>): boolean {
  if (Array.isArray(a) && Array.isArray(b)){
    if (a.length === b.length){
      for (let i = 0; i < a.length; i++){
        let aa = a[i];
        let bb = b[i];
        if (aa.isEqual && bb.isEqual){
          if (!aa.isEqual(bb)){
            return false;
          }
        } else {
          console.warn('expected isEqual');
          return false;
        }
      }
      return true;
    }
  }
  return false;
}

interface ScoringFunction<T> {
  (value: T) : number;
}
interface CompareScoresFunction {
  (a: number, b: number) : boolean;
}

/**
 * Given an array, a scoring function, and a score comparison function, find the item in the
 * array that scores best
 *
 */
export function arrayFindBest<T>(arr: Array<T>, scoreFn: ScoringFunction<T>, compareScoreFn: CompareScoresFunction): T | undefined {
  let best: T | undefined = undefined;
  let bestScore: any = undefined;

  arr.forEach(value => {
      let score = scoreFn(value);
      if (bestScore === undefined || compareScoreFn(bestScore, score)){
        best = value;
        bestScore = score;
      }
    });

  return best;
}

/**
 * Given an array, a scoring function, and a score comparison function, find the best score
 *
 */
export function arrayFindBestScore<T>(arr: Array<T>, scoreFn: ScoringFunction<T>, compareScoreFn: CompareScoresFunction) : number | undefined {
  let bestScore: number | undefined = undefined;

  arr.forEach(value => {
    let score = scoreFn(value);
    if (bestScore === undefined || compareScoreFn(bestScore, score)){
      bestScore = score;
    }
  });

  return bestScore;
}

export function arrayLast<T>(a: Array<T>): T {
  return a[a.length - 1];
}

export function arrayPickRandom<T>(a: Array<T>): T {
  return a[getRandomInt(a.length)];
}

export function parseJson(text: string){
  let result = undefined;
  try {
    result = JSON.parse(text);
  } catch (e) {
  }
  return result;
}

/**
 * Compare two objects, looking at their properties.
 * Equal if both objects have the same property keys and the property
 * values compare as true with either === operator or an isEqual member
 * function, if the property values are Objects themselves
 */
export function objectsAreEqual(a:  StringKeyedObject, b: StringKeyedObject){
  let result = false;
  const aKeys = Object.keys(a);
  if (aKeys.length === Object.keys(b).length){
    result = true;
    for (let key of aKeys){
      const propertyA = a[key];
      const propertyB = b[key];
      if (typeof propertyA === typeof propertyB){
        if (typeof propertyA === "object"){
          if (!propertyA.isEqual(propertyB)){
            result = false;
            break;
          }
        } else {
          if (a[key] !== b[key]){
            result = false;
            break;
          }
        }
      } else {
        result = false;
        break;
      }
    }
  }
  return result;
}

export function objectsAdd(a: StringKeyedObject, b: StringKeyedObject){
  const aKeys = Object.keys(a);
  if (aKeys.length === Object.keys(b).length){
    for (let key of aKeys){
      const propertyA = a[key];
      const propertyB = b[key];
      if (typeof propertyA === 'number' &&
          typeof propertyB === 'number' ){
        a[key] += b[key]
      }
    }
  }
}

export function objectsSubtract(a: StringKeyedObject, b: StringKeyedObject){
  const aKeys = Object.keys(a);
  if (aKeys.length === Object.keys(b).length){
    for (let key of aKeys){
      const propertyA = a[key];
      const propertyB = b[key];
      if (typeof propertyA === 'number' &&
        typeof propertyB === 'number' ){
        a[key] -= b[key]
      }
    }
  }
}

export function objectMultiply(a: StringKeyedObject, x: number){
  const aKeys = Object.keys(a);
  for (let key of aKeys){
    const propertyA = a[key];
    if (typeof propertyA === 'number'){
      a[key] *= x;
    }
  }
}

export function shallowClone<T>(o: T): StringKeyedObject {
  let result = {}
  Object.assign(result, o);
  return result;
}
/*
export function standardDeviation(arr: Array<number>, usePopulation = false) : number{
  const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
  return Math.sqrt(
    arr
      .reduce((acc, val) => acc.concat((val - mean) ** 2), [])
      .reduce((acc, val) => acc + val, 0) /
      (arr.length - (usePopulation ? 0 : 1))
  );
}
*/


export function testAll(){
  assert(true, 'true');

  for (let i = 1; i <= 1000; i*= 10) {
    console.log('getRandomInt(' + i + '):' + getRandomInt(i))
  }

  for (let i = 3; i < 13; i+= 2){
    console.log(`intMid(1, ${i}): ${intMid(1, i)}`);
  }

  let testArray = ["One", "Two", "Three", "Four", "Five"];
  console.log('arrayLast:' + arrayLast(testArray));

  console.log('arrayPickRandom' + arrayPickRandom(testArray));

  let testString = `Top Level
  + sub item
  + sub item

Another top level`;
  console.log(indentString(testString, 4, ' '));

}