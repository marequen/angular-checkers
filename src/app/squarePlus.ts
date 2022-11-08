import {Square} from '../engine/checkersBase';

export class SquarePlus {
  square: Square;
  active: boolean;
  highlighted: boolean;
  forcedJump: boolean;

  constructor(s: Square){
    this.square = s;
    this.active = false;
    this.highlighted = false;
    this.forcedJump = false;
  }
}