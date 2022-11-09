import {Square} from '../engine/checkersBase';

export class SquarePlus {
  square: Square;
  active: boolean;
  highlighted: boolean;
  forcedJump: boolean;
  animationData: { top: number, left: number} | null = null;

  constructor(s: Square){
    this.square = s;
    this.active = false;
    this.highlighted = false;
    this.forcedJump = false;
  }
}