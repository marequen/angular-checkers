import * as sr from "./sr";
import {Board, BoardLocation, Square} from "./checkersBase";

export class Move {
  startRow: number;
  startCol: number;
  targetRow: number;
  targetCol: number;
  kinged: boolean;

  /**
   * @param {number} startRow
   * @param {number} startCol
   * @param {number} targetRow
   * @param {number} targetCol
   */
  constructor(startRow:number, startCol:number, targetRow:number, targetCol:number) {
    /** @type @const */ this.startRow = startRow;
    /** @type @const */ this.startCol = startCol;
    /** @type @const */ this.targetRow = targetRow;
    /** @type @const */ this.targetCol = targetCol;
    this.kinged = false;
    if (!Board.isValidRowAndColumn(startRow, startCol)) throw 'data error';
    if (!Board.isValidRowAndColumn(targetRow, targetCol)) throw 'data error';
  }

  serialize() : sr.StringKeyedObject {
    throw 'do not call this'
  }

  capturesPieces():boolean { return false; }
  capturesMultiplePieces(): boolean { return false; }
  capturedPieces(): Array<BoardLocation> { return []; }

  isEqual(other: Move):boolean {
    if (other instanceof Move) {
      if (other.startRow === this.startRow &&
        other.startCol === this.startCol &&
        other.targetRow === this.targetRow &&
        other.targetCol === this.targetCol) {
        return true;
      }
    }
    return false;
  }

  static filterJumps(moves: Array<Move>): Array<SingleJumpMove> {
    let result : Array<SingleJumpMove> = [];
    for (let move of moves){
      if (move instanceof SingleJumpMove ){
        result.push(move as SingleJumpMove)
      }
    }
    return result;
  }
}

export class SimpleMove extends Move {

  constructor(startRow:number, startCol:number, targetRow:number, targetCol:number) {
    super(startRow, startCol, targetRow, targetCol);
    if (Math.abs(startRow - targetRow) !== 1) throw 'data error';
    if (Math.abs(startCol - targetCol) !== 1) throw 'data error';
  }

  override serialize() : sr.StringKeyedObject {
    let result = sr.shallowClone(this);
    result['type'] = 'SimpleMove';
    return result;
  }

  static create(data: sr.StringKeyedObject){
    if (data['pieceType']){
      // old data format
      const targetRow = data['startRow'] + (data['up'] ?  - 1 : 1);
      const targetCol = data['startCol'] + (data['left'] ? -1 : 1);
      return new SimpleMove(data['startRow'], data['startCol'], targetRow, targetCol);
    }
    return new SimpleMove(data['startRow'], data['startCol'], data['targetRow'], data['targetCol']);
  }

  override toString(): string {
    return `SimpleMove from ${this.startRow},${this.startCol} to ${this.targetRow},${this.targetCol}`;
  }

  override isEqual(other: Move): boolean {
    if (other instanceof SimpleMove){
      return super.isEqual(other);
    }
    return false;
  }
}

interface SingleJumpMoveCallback {
  (move: SingleJumpMove) : void;
}

export class SingleJumpMove extends Move {
  jumpRow: number;
  jumpCol: number;
  _nextJump: SingleJumpMove | null;
  jumpedPieceWasKing: boolean; // used for undo/redo

  constructor(startRow:number, startCol:number, targetRow:number, targetCol:number) {
    super(startRow, startCol, targetRow, targetCol);
    if (Math.abs(startRow - targetRow) !== 2) throw 'data error';
    if (Math.abs(startCol - targetCol) !== 2) throw 'data error';
    this.jumpRow = sr.intMid(startRow, targetRow);
    this.jumpCol = sr.intMid(startCol, targetCol);
    this._nextJump = null;
    this.jumpedPieceWasKing = false;
  }

  cloneWithNextJump(next: SingleJumpMove): SingleJumpMove {
    let result = new SingleJumpMove(this.startRow, this.startCol, this.targetRow, this.targetCol);
    result._nextJump = next;
    return result;
  }

  override serialize(): sr.StringKeyedObject {
    let result: sr.StringKeyedObject = sr.shallowClone(this);
    result['type'] = 'SingleJumpMove';
    if (!!this._nextJump) {
      result['_nextJump'] = this._nextJump.serialize();
    }
    return result;
  }

  static create(data: sr.StringKeyedObject): SingleJumpMove {
    let result;
    if (data['pieceType']){
      // old data format
      const targetRow = data['startRow'] + (data['up'] ?  - 2 : 2);
      const targetCol = data['startCol'] + (data['left'] ? -2 : 2);
      result = new SingleJumpMove(data['startRow'], data['startCol'], targetRow, targetCol);
    } else {
      result = new SingleJumpMove(data['startRow'], data['startCol'], data['targetRow'], data['targetCol']);
    }
    if (data['_nextJump']){
      result._nextJump = SingleJumpMove.create(data['_nextJump']);
    }
    return result;
  }

  override toString():string {
    let result: string;
    if (!!this._nextJump) {
      result = `SingleJumpMove (multi) from ${this.startRow},${this.startCol}`
      this.forEachMove( move => result += ` to ${move.targetRow},${move.targetCol}`);
    } else {
      result = `SingleJumpMove from ${this.startRow},${this.startCol} to ${this.targetRow},${this.targetCol}`;
    }
    return result;
  }

  override capturesPieces(): boolean { return true; }

  override capturesMultiplePieces() { return !!this._nextJump; }

  capturedPiece() : BoardLocation {
    return new BoardLocation(this.jumpRow, this.jumpCol);
  }

  forEachMove(fn: SingleJumpMoveCallback) {
    for (let move: SingleJumpMove | null = this; !!move; move = move._nextJump){
      fn(move);
    }
  }

  override capturedPieces(): Array<BoardLocation> {
    let result: Array<BoardLocation> = [ ];
    this.forEachMove( move => result.push(move.capturedPiece()));
    return result;
  }

  getJumpedPiece(board: Board): Square {
    return board.whatsAtRowColumn(this.jumpRow, this.jumpCol);
  }

  getNextJump(){
    return this._nextJump;
  }

  override isEqual(other: Move) : boolean {
    if (other instanceof SingleJumpMove){
      if (super.isEqual(other)){
        if (this._nextJump && other._nextJump){
          // recurse
          return this._nextJump.isEqual(other._nextJump);
        } else {
          return(!!this._nextJump === !!other._nextJump);
        }
      }
    }
    return false;
  }

  validate(){
    let allValid = true;
    let previous : Move | null = null;
    let jumpedSquares: Array<BoardLocation> = [];
    let i = 0;
    this.forEachMove( move => {
      if (allValid) {
        if (previous) {
          allValid = move.startRow === previous.targetRow &&
            move.startCol === previous.targetCol;
          sr.assert(allValid,`mismatch b/w move ${i - 1} and ${i}`);
        }

        const jumpMove = move.getNextJump();
        if (jumpMove){
          const jmpLoc = new BoardLocation(move.jumpRow, move.jumpCol);
          sr.assert(jumpedSquares.some( loc => loc.isEqual(jmpLoc)) === false, 'dupe jump found at index ' + i);
          jumpedSquares.push(new BoardLocation(move.jumpRow, move.jumpCol));
        }
        previous = move;
        i++;
      }
    });

    return allValid;
  }
}


