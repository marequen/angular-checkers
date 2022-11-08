import * as sr from './sr';
import {Move, SimpleMove, SingleJumpMove} from "./move";

export enum SquareColor {
  LIGHT = 0,
  DARK = 1
}

/**
 * @readonly
 * @enum {number}
 */
export enum PieceType {
  BLACK   = 0,
  RED,
}

const KING_FLAG = 1;
const BLACK_FLAG = 2;
const RED_FLAG = 4;

/**
 * @readonly
 * @enum {number}
 */
export enum SquareValue {
  NOT_PLAYABLE = 0,

  EMPTY        = 1,

  BLACK        = BLACK_FLAG,
  BLACK_KING   = BLACK_FLAG | KING_FLAG,

  RED          = RED_FLAG,
  RED_KING     = RED_FLAG | KING_FLAG
}


let SquareValueString : Array< string > = [];
SquareValueString[SquareValue.NOT_PLAYABLE] = '_';
SquareValueString[SquareValue.EMPTY] = ' ';
SquareValueString[SquareValue.BLACK] = 'b';
SquareValueString[SquareValue.BLACK_KING] = 'B';
SquareValueString[SquareValue.RED] = 'r';
SquareValueString[SquareValue.RED_KING] = 'R';

let temp = [];
temp[PieceType.BLACK] = PieceType.RED;
temp[PieceType.RED] = PieceType.BLACK;
export const opponentPieceType = temp;

let temp2 = [];
temp2[PieceType.RED] = 'red';
temp2[PieceType.BLACK] = 'black';
export const pieceColorString = temp2;

const DEBUG_TRACE = true;

export class BoardLocation {
  row: number;
  col: number;
  constructor(row: number, col:number) {
    this.row = row;
    this.col = col;
  }
  isEqual(other: BoardLocation){
    return this.row === other.row && this.col === other.col;
  }
  isValid(): boolean {
    return Board.isValidRowAndColumn(this.row, this.col);
  }

  serialize(): Object {
    return sr.shallowClone(this);
  }
  static create(data: { row: number, col: number }): BoardLocation {
    return new BoardLocation(data['row'], data['col']);
  }

  //+++ This really doesn't belong here
  offsetBy(board: Board, rowOffset: number, colOffset: number): BoardLocation | undefined{
    const row = this.row + rowOffset;
    const col = this.col + colOffset;
    if (Board.isValidRowAndColumn(row, col)){
      const index = rowCol2Square(row, col);
      return board.squares[index].loc;
    }
    return undefined;
  }

  distanceTo(other: BoardLocation){
    let rowDelta = Math.abs(this.row - other.row);
    let colDelta = Math.abs(this.col - other.col);
    return Math.sqrt(rowDelta * rowDelta + colDelta * colDelta);
  }
}

export class Square {
  color: SquareColor;
  value: SquareValue;
  moves: SquareMoves | undefined;
  loc: BoardLocation;
  piece: Piece | undefined;

  constructor(value: SquareValue, loc: BoardLocation) {
    this.color = SquareColor.LIGHT;
    if (((loc.row + loc.col) % 2) === 1){
      this.color = SquareColor.DARK;
    }
    this.value = value;
    this.moves = undefined;
    this.loc = loc;
    let pt = this.pieceType();
    if (pt !== undefined){
      this.piece = new Piece(this, pt);
    }
  }

  clone(): Square {
    let result = new Square(this.value, this.loc);
    result.moves = this.moves;
    return result;
  }

  static valueOf(pieceType: PieceType, king: boolean): SquareValue {
    let squareValue = (pieceType === PieceType.BLACK) ? SquareValue.BLACK : SquareValue.RED;
    if (king) {
      squareValue |= KING_FLAG;
    }
    return squareValue;
  }

  isEqual(other: Square):boolean {
    return this.value === other.value && this.loc.isEqual(other.loc);
  }

  hasPiece():boolean {
    return this.isBlack() || this.isRed();
  }

  pieceType(): PieceType | undefined {
    if (this.isRed()) return PieceType.RED;
    if (this.isBlack()) return PieceType.BLACK;
    return undefined;
  }

  isEmpty(): boolean {
    return this.value === SquareValue.EMPTY;
  }

  isKing(): boolean {
    return this.hasKing();
  }

  hasKing(): boolean {
    return (this.value & KING_FLAG) === KING_FLAG && this.value !== SquareValue.EMPTY;
  }

  dethrone(){
    let pt = this.pieceType();
    if (pt !== undefined){
      this.value = Square.valueOf(pt, false);
    }
  }

  isRed(): boolean {
    return (this.value & RED_FLAG) === RED_FLAG;
  }

  isBlack(): boolean {
    return (this.value & BLACK_FLAG) === BLACK_FLAG;
  }

  distanceTo(other: Square){
    return this.loc.distanceTo(other.loc);
  }
}

enum SquareMovesHint {
  NO_HINT,
  NO_JUMP_CHAINS
}

class SquareMoves {
  simpleMoves: Array<SimpleMove>;
  jumpMoves: Array<SingleJumpMove>;

  constructor(row: number, col: number) {

    this.simpleMoves = [];
    this.jumpMoves = [];

    // Simple Moves
    if (row > 0){
      if (col > 0){
        this.simpleMoves.push(new SimpleMove(row, col, row - 1, col - 1));
      }
      if (col < 7){
        this.simpleMoves.push(new SimpleMove(row, col, row - 1, col + 1));
      }
    }
    if (row < 7){
      if (col > 0){
        this.simpleMoves.push(new SimpleMove(row, col, row + 1, col - 1));
      }
      if (col < 7){
        this.simpleMoves.push(new SimpleMove(row, col, row + 1, col + 1));
      }
    }

    // Jump Moves
    if (row > 1){
      if (col > 1){
        this.jumpMoves.push(new SingleJumpMove(row, col, row - 2, col - 2));
      }
      if (col < 6){
        this.jumpMoves.push(new SingleJumpMove(row, col, row - 2, col + 2));
      }
    }
    if (row < 6){
      if (col > 1){
        this.jumpMoves.push(new SingleJumpMove(row, col, row + 2, col - 2));
      }
      if (col < 6){
        this.jumpMoves.push(new SingleJumpMove(row, col, row + 2, col + 2));
      }
    }
  }

   hasMove(board: Board):boolean {
    if (this.simpleMoves.some( move => board.isValidMove(move))){
      return true;
    }
    return this.jumpMoves.some(move => board.isValidMove(move));
  }

  getMoves(board: Board, hint: SquareMovesHint = SquareMovesHint.NO_HINT): Array<Move> {
    let validJumpMoves = this.jumpMoves.filter(move => board.isValidMove(move) );
    if (validJumpMoves.length){
      if (hint === SquareMovesHint.NO_JUMP_CHAINS){
        return validJumpMoves;
      }

      let allMoveChains: Array<Move> = [];
      const boardHash = board.getHash();
      validJumpMoves.forEach(move => {
        let moveChains = this._getMoveChains(board.clone(), move);
        if (DEBUG_TRACE) {
          sr.assert(sr.arraysEqual(allMoveChains, moveChains) === false);
          moveChains.forEach(chain => sr.assert(board.isValidMove(chain)));
        }
        // Merge the second array into the first one
        Array.prototype.push.apply(allMoveChains, moveChains)
      });
      sr.assert(boardHash === board.getHash(), 'board changed');
      if (DEBUG_TRACE) {
        sr.assert(allMoveChains[0].isEqual(allMoveChains[1]) === false);
      }
      return allMoveChains;
    }

    return this.simpleMoves.filter(move => board.isValidMove(move));
  }

  getSimpleMoves(board: Board): Array<Move>{
    return this.simpleMoves.filter(move => board.isValidMove(move));
  }

  _getMoveChains(board: Board, startingMove: SingleJumpMove):Array<SingleJumpMove> {
    let results = [];

    board.executeMove(startingMove);

    const nextMoves = board.getMovesForRowAndCol(startingMove.targetRow, startingMove.targetCol);
    let jumpCandidates = Move.filterJumps(nextMoves);

    if (jumpCandidates.length === 0){
      // No additional jumps. Return the starting move
      results.push(startingMove);
    } else {
      jumpCandidates.forEach(move => {
        let chain = startingMove.cloneWithNextJump(move);
        results.push(chain);
      });
    }

    if (DEBUG_TRACE){
      let allValid = true;
      results.forEach(move => {
        if (allValid){
          allValid = move.validate()
        }
      });
      if (!allValid){
        // for debugging
        board.getMovesForRowAndCol(startingMove.targetRow, startingMove.targetCol);
      }
    }
    return results;
  }

}

function rowCol2Square(r: number, c: number): number {
  return r * 8 + c
}

function square2BoardLocation(s: number): BoardLocation {
  const col = s % 8;
  const row = (s - col) / 8;
  return new BoardLocation(row, col);
}

export class Piece {
  square: Square;
  pieceType: PieceType;

  constructor(square: Square, pieceType: PieceType) {
    this.square = square;
    this.pieceType = pieceType;
  }

  isEqual(other: Piece): boolean {
    return this.square.isEqual(other.square);
  }
  isKing(): boolean {
    return this.square.isKing();
  }
  distanceFromHomeRow(board: Board): number {
    const movesUp = board.pieceTypeMovesUp(this.pieceType);
    return (movesUp ? 7 - this.square.loc.row : this.square.loc.row);
  }

  movesTo(other: Piece): number|undefined {
    return this.movesToLocation(other.square.loc);
  }

  movesToLocation(other: BoardLocation): number|undefined {
    const rowDelta = Math.abs(this.square.loc.row - other.row);
    const colDelta = Math.abs(this.square.loc.col - other.col);
    if (this.square.isKing()){
      return Math.max(rowDelta, colDelta);
    } else {
      if (colDelta > rowDelta) return undefined; // Can't get there from here
      return rowDelta;
    }
  }

  shortestDistanceTo(board: Board, locations: Array<BoardLocation>): number|undefined {
    const myLoc = this.square.loc;
    let shortest: number | undefined;
    for (let loc of locations){
      let m2l = this.movesToLocation(loc);
      if (m2l != undefined){
        if (shortest == undefined || m2l < shortest){
          shortest = m2l;
        }
      }
    }
    return shortest;
  }
}

interface SquarePredicate {
  (square: Square): boolean;
}

export class Board {
  blackMovesUp: boolean;
  squares: Array<Square>;

  constructor(other?: Board) {
    if (other){
      this.blackMovesUp = other.blackMovesUp;
      this.squares = [];

      // Clone the squares, so each board can have its own state
      other.squares.forEach( (square, i) => {
        this.squares[i] = square.clone();
      });

    } else {
      this.blackMovesUp = true;
      this.squares = [];

      for (let i = 0; i < 64; i++) {
        const loc = square2BoardLocation(i);
        this.squares[i] = new Square(SquareValue.NOT_PLAYABLE, loc);
      }

      this.clear();

      for (let i = 0; i < 64; i++) {
        const square = this.squares[i];
        if (square.value !== SquareValue.NOT_PLAYABLE) {
          square.moves = new SquareMoves(square.loc.row, square.loc.col)
        }
      }
    }
  }

  clear(){
    for (let row = 0; row < 8; row++){
      // Must stagger starting empty square, on each row, to get checkerboard pattern
      const startCol = (row + 1) % 2;
      for (let col = startCol; col < 8; col+= 2){
        const sidx = rowCol2Square(row, col);
        this.squares[sidx].value = SquareValue.EMPTY;
      }
    }
  }

  clone(){
    let result = new Board(this);
    if (DEBUG_TRACE){
      const hashA = this.getHash();
      const hashB = result.getHash();
      sr.assert(hashA === hashB, 'Board.clone failed');
    }
    return result;
  }

  serialize(): Object {
    return {
      blackMovesUp : this.blackMovesUp,
      squares  : this.squares.map( square => square.value)
    }
  }

  serializeIn(data: sr.StringKeyedObject){
    if (data['kingRow']){
      // old version
      this.blackMovesUp = data['kingRow'][0] === 0;
    } else {
      this.blackMovesUp = data['blackMovesUp'];
    }

    if (data['pieces']){
      // Old format
      const _loadPieces = (pieceType: PieceType) => {

        const piecesData = data['pieces'][pieceType];
        piecesData.forEach( (pieceData: sr.StringKeyedObject) => {
          if (pieceData){
            let squareValue = Square.valueOf(pieceData['type'], pieceData['_king']);
            this.setPieceAtRowAndColumn(pieceData['row'], pieceData['col'], squareValue);
          }
        });
      }

      _loadPieces(PieceType.RED);
      _loadPieces(PieceType.BLACK);
    } else {
      const squares = data['squares'];
      squares.forEach( (squareValue: any, index: number) => {
        let square = this.squares[index];
        square.value = squareValue;
        let pt = square.pieceType();
        if (pt !== undefined){
          square.piece = new Piece(square, pt);
        }
      })
    }
  }

  getHash(){
    let result = '';
    this.squares.forEach( (v, i) => {
      result += SquareValueString[v.value];
      if (i % 8 === 7) result += "\n";
    });
    return result;
  }

  static create(data: sr.StringKeyedObject){
    let result = new Board();
    result.serializeIn(data);
    return result;
  }

  static isValidRowAndColumn(row: number, col: number): boolean {
    return Number.isInteger(row) && Number.isInteger(col) &&
      row > -1 && row < 8 && col > -1 && col < 8;
  }

  pieceTypeMovesUp(pieceType: PieceType): boolean {
    return pieceType === PieceType.BLACK ? this.blackMovesUp : !this.blackMovesUp;
  }

  setPieceAtRowAndColumn(row: number, col: number, value: SquareValue){
    let square = this.squareAtRowAndCol(row, col);
    square.value = value;
    let pt = square.pieceType();
    if (pt !== undefined) {
      square.piece = new Piece(square, pt);
    }
  }

  squareAtRowAndCol(row: number, col: number): Square {
    const index = rowCol2Square(row, col);
    return this.squares[index];
  }

  whatsAtRowColumn(row: number, col: number): Square {
    const squareIndex = rowCol2Square(row, col);
    return this.squares[squareIndex];
  }

  capturePieceAtRowAndColumn(row: number, col: number){
    this.clearPieceAtRowAndColumn(row, col)
  }

  clearPieceAtRowAndColumn(row: number, col: number){
    let square = this.squareAtRowAndCol(row, col);
    square.value = SquareValue.EMPTY;
    square.piece = undefined;
  }

  /**
   * Recreate a piece that was previously captured. Used for Undo.
   */
  uncapturePiece(pieceType: PieceType, row:number, col:number, king:boolean){
    const existing = this.whatsAtRowColumn(row, col);
    sr.assert(existing.isEmpty());
    if (existing.isEmpty()) {
      let squareValue = Square.valueOf(pieceType, king);
      this.setPieceAtRowAndColumn(row, col, squareValue);
    }
  }

  _getPieces(predicate: SquarePredicate): Array<Piece> {
    let result: Array<Piece> = [];
    this.squares.forEach( (square, index) => {
      let piece = square.piece;
      if (piece !== undefined && predicate(square)){
        result.push(piece);
      }
    });
    return result;
  }
  getPieces(pieceType: PieceType): Array<Piece> {
    return this._getPieces( square => square.pieceType() === pieceType);
  }
  getKings(pieceType: PieceType): Array<Piece> {
    return this._getPieces( square => square.pieceType() === pieceType && square.isKing());
  }
  getPotentialKingSquares(pieceType: PieceType): Array<BoardLocation> {
    let result = [];
    const kingRow = this.pieceTypeKingRow(pieceType);
    for (let col = 0; col < 8; col++){
      const square = this.squareAtRowAndCol(kingRow, col);
      // If the square is empty, or has one of our own pieces in it,
      // it's a good target to go to in order to become a king.
      if (square.isEmpty() || square.pieceType() === pieceType){
        result.push(square.loc);
      }
    }
    return result;
  }
/*
  private static _findPieceAt(loc: BoardLocation, allPieces: Array<Piece>): Piece {
    return allPieces.find( piece => piece.loc.isEqual(loc) );
  }

  private static _findPieceForMove(move: Move, allPieces: Array<Piece>): Piece {
    return allPieces.find( piece => piece.loc.row === move.startRow && piece.loc.col === move.startCol );
  }

  private _countSuicideMoves(index: number, simpleMoves: Array<Move>, allPieces: Array<Piece>): number {
    const squareLoc = square2BoardLocation(index);
    const pieceType = this.squares[index].pieceType();
    let nSuicideMoves = 0;
    for (let m of simpleMoves){

      let postMoveLoc = new BoardLocation(m.targetRow, m.targetCol);
      let bc = this.clone();
      bc.executeMove(m);

      const rangeMin = squareLoc.offsetBy(-1, -1);
      const rangeMax = squareLoc.offsetBy(1, 1);

      let opponentMoves = bc._getPossibleMovesByPieceTypeNoJumpChains(opponentPieceType[pieceType], rangeMin, rangeMax);

      for (let om of opponentMoves){
        let cps = om.capturedPieces();
        if (cps.length) {
          let cp = cps[0];
          if (cp && cp.isEqual(postMoveLoc)) {
            nSuicideMoves++;
            let player = Board._findPieceAt(squareLoc, allPieces);
            if (player !== undefined) {
              player.isPinningDown = true;
            }
            let oppo = Board._findPieceForMove(om, allPieces);
            if (oppo !== undefined) {
              oppo.isPinningDown = true;
            }
            break;
          }
        }
      }
    }
    return nSuicideMoves;
  }
*/
  _isPinnedDownAt(loc: BoardLocation, pieceType: PieceType, rowDirection: number, colDirection: number): boolean {

    const diagonal1Loc = loc.offsetBy(this, rowDirection, colDirection);

    // If the next row in the given direction is invalid, we can't go there
    if (diagonal1Loc === undefined) return true;

    const diagonal1 = this.whatsAtRowColumn(diagonal1Loc.row, diagonal1Loc.col);

    // If there's a piece in the square, we can't move there
    if (diagonal1.hasPiece()) return true;

    const diagonal2Loc = diagonal1Loc.offsetBy(this, rowDirection, colDirection);
    // If diagonal2 is invalid, that means diagonal1 was on the edge, and we can safely
    // move to diagonal1 without being captured. So we're not pinned down.
    if (diagonal2Loc === undefined) return false;

    const diagonal2 = this.whatsAtRowColumn(diagonal2Loc.row, diagonal2Loc.col);
    if (diagonal2.hasPiece() && diagonal2.pieceType() !== pieceType){
      // There's an opponent, diagonal from us, pinning us down
      return true;
    }

    const besideLoc = loc.offsetBy(this, 0, 2 * colDirection);
    if (besideLoc !== undefined){
      // Now see if a piece ahead of us would jump us, landing in the square beside us.
      const beside2 = this.whatsAtRowColumn(besideLoc.row, besideLoc.col);
      if (beside2.hasPiece() === false){
        const ahead2Loc = loc.offsetBy(this, rowDirection * 2, 0);
        if (ahead2Loc !== undefined){
          const ahead2 = this.whatsAtRowColumn(ahead2Loc.row , ahead2Loc.col);
          if (ahead2.hasPiece() && ahead2.pieceType() !== pieceType) return true;
        }
      }
    }

    return false;
  }

  _isPinnedDownLeft(loc: BoardLocation, pieceType: PieceType, direction: number): boolean {
    return this._isPinnedDownAt(loc, pieceType, direction, -1);
  }

  _isPinnedDownRight(loc: BoardLocation, pieceType: PieceType, direction: number): boolean {
    return this._isPinnedDownAt(loc, pieceType, direction, 1);
  }

  _isPinnedDownLeftAndRight(loc: BoardLocation, pieceType: PieceType, direction: number): boolean {
    return this._isPinnedDownLeft(loc, pieceType, direction) && this._isPinnedDownRight(loc, pieceType, direction);
  }

  isPieceInSquarePinnedDown(square: Square): boolean {
    let result = false;
    const squareLoc = square.loc;
    const pieceType = square.pieceType();
    const isKing = square.isKing();
    if (pieceType){
      if (isKing){
        result = this._isPinnedDownLeftAndRight(squareLoc, pieceType, -1) &&
          this._isPinnedDownLeftAndRight(squareLoc, pieceType, 1);
      } else if (this.pieceTypeMovesUp(pieceType)){
        result = this._isPinnedDownLeftAndRight(squareLoc, pieceType, -1);
      } else {
        result = this._isPinnedDownLeftAndRight(squareLoc, pieceType, 1);
      }
    }
    return result;
  }

  countMatchingPieces( predicate: SquarePredicate): number {
    let n = 0;
    for (let i = 0; i < 64; ++i){
      const s = this.squares[i];
      if (s.hasPiece() && predicate(s)){
        n++;
      }
    }
    return n;
  }

  getPieceCount(pieceType: PieceType){
    return this.countMatchingPieces( (square) => square.pieceType() === pieceType);
  }

  isValidMove(move: Move){
    let allChecksOk = false;
    let firstCheckOk = false;
    const thingAtStart = this.whatsAtRowColumn(move.startRow, move.startCol);
    const pieceType = thingAtStart.pieceType();
    if (pieceType !== undefined) {
      const thingAtTarget = this.whatsAtRowColumn(move.targetRow, move.targetCol);
      if (thingAtTarget.isEmpty()) {
        const pieceMovesUp = this.pieceTypeMovesUp(pieceType);
        const king = thingAtStart.isKing();
        if (move.startRow > move.targetRow) {
          // moving up
          firstCheckOk = pieceMovesUp || king;
        } else if (move.startRow < move.targetRow) {
          // moving down
          firstCheckOk = !pieceMovesUp || king;
        }
      }

      if (firstCheckOk) {
        if (move instanceof SingleJumpMove) {
          allChecksOk = this._isValidJumpMove(move, pieceType, thingAtStart);
        } else {
          allChecksOk = true;
        }
      }
    }
    return allChecksOk;
  }

  _isValidJumpMove(jumpMove: SingleJumpMove, pieceType: PieceType, initialSquare: Square): boolean {
    let result = false;
    const thingAtTarget = this.whatsAtRowColumn(jumpMove.targetRow, jumpMove.targetCol);
    if (thingAtTarget.isEmpty() || thingAtTarget === initialSquare){
      const thingAtJump = jumpMove.getJumpedPiece(this);
      if (thingAtJump.hasPiece() && thingAtJump.pieceType() === opponentPieceType[pieceType]){
        let nextJump = jumpMove.getNextJump();
        if (nextJump !== null){
          result = this._isValidJumpMove(nextJump, pieceType, initialSquare);
        } else {
          result = true;
        }
      }
    }
    return result;
  }

  getMovesForRowAndCol(row: number, col: number) : Array<Move> {
    const square = this.squareAtRowAndCol(row, col);
    if (square && square.moves) {
      return square.moves.getMoves(this);
    }
    return [];
  }

  getMovesForSquare(i: number, pieceType: PieceType, hint: SquareMovesHint = SquareMovesHint.NO_HINT): Array<Move> {
    const s = this.squares[i];
    if (s !== undefined && s.pieceType() === pieceType && s.moves) {
      return s.moves.getMoves(this, hint);
    }
    return [];
  }

  /**
   * Returns all valid moves for a particular piece type (color)
   * 
   * 
   */
  getMovesByPieceType(pieceType: PieceType): Array<Move> {
    let result: Array<Move> = [];
    for (let i = 0; i < 64; ++i){
      result = result.concat(this.getMovesForSquare(i, pieceType))
    }
    return result;
  }

  getPossibleMovesByPieceType(pieceType: PieceType): Array<Move> {
    let moves = this.getMovesByPieceType(pieceType);
    let jumpMoves = Move.filterJumps(moves);
    if (jumpMoves.length){
      // If there are any jump moves, we can only take jump moves
      moves = jumpMoves;
    }
    return moves;
  }
/*
  _getPossibleMovesByPieceTypeNoJumpChains(pieceType: PieceType, rangeMin: BoardLocation, rangeMax: BoardLocation) {
    let moves = [];
    for (let row = rangeMin.row; row <= rangeMax.row; row++) {
      for (let col = rangeMin.col; col <= rangeMax.col; col++) {
        const i = rowCol2Square(row, col);
        moves = moves.concat(this.getMovesForSquare(i, pieceType, SquareMovesHint.NO_JUMP_CHAINS))
      }
    }
    let jumpMoves = Move.filterJumps(moves);
    if (jumpMoves.length){
      // If there are any jump moves, we can only take jump moves
      moves = jumpMoves;
    }
    return moves;
  }
*/

  /**
   * Returns true if pieceType has at least one valid move
   */
  pieceTypeHasMove(pieceType: PieceType): boolean {
    for (let i = 0; i < 64; ++i){
      const s = this.squares[i];
      if (s !== undefined && s.pieceType() === pieceType && s.moves){
        if (s.moves.hasMove(this)) return true;
      }
    }
    return false;
  }

  getPieceTypeFrozenPieces(pieceType: PieceType): number {
    return this.countMatchingPieces( (square) =>
        square.pieceType() === pieceType && square.moves !== undefined && square.moves.hasMove(this) === false
    )
  }

  getPinnedDownPiecesOfType(pieceType: PieceType): number {
    return this.countMatchingPieces( square => {
      return square.pieceType() === pieceType && this.isPieceInSquarePinnedDown(square);
    })
  }
/*
  static getClearPathsToRow(loc: BoardLocation, targetRow: number): number {
    if (loc.row === targetRow) return 1;

    let result = 0;
    const rowDelta = loc.row < targetRow ? 1 : -1;
    //+++ Get rid of unnecessary 'new BoardLocation' calls
    let tempLoc = new BoardLocation(loc.row + rowDelta, loc.col - 1);
    if (tempLoc.isValid()){
      result += this.getClearPathsToRow(tempLoc, targetRow);
    }
    tempLoc.col = loc.col + 1;
    if (tempLoc.isValid()){
      result += this.getClearPathsToRow(tempLoc, targetRow);
    }
    return result;
  }
*/
  executeMove(move: Move){
    const initialHash = DEBUG_TRACE ? this.getHash() : '';
    if (this.isValidMove(move)){
      this.movePieceFromTo(move.startRow, move.startCol, move.targetRow, move.targetCol);
      if (move instanceof SingleJumpMove){
        let jumpMove = move as SingleJumpMove;
        this.capturePieceAtRowAndColumn(jumpMove.jumpRow, jumpMove.jumpCol);
        let nextJump = jumpMove.getNextJump();
        if (nextJump) {
          // recurse
          this.executeMove(nextJump);
        }
      }
    } else {
      sr.assert(false, `illegal move ${move.toString()} board state:\n${initialHash}`);
      if (DEBUG_TRACE) {
        // for debugging
        this.isValidMove(move)
      }
    }
  }

  movePieceFromTo(startRow:number, startCol:number, targetRow:number, targetCol:number){
    const thingAtStart = this.whatsAtRowColumn(startRow, startCol);
    const pieceAtStart = thingAtStart.piece;
    if (pieceAtStart){
      const pieceType = pieceAtStart.pieceType;
      const wasKing = pieceAtStart.isKing();
      const king = wasKing || targetRow === this.pieceTypeKingRow(pieceType);
      const newValue = Square.valueOf(pieceType, king);
      this.clearPieceAtRowAndColumn(startRow, startCol);
      this.setPieceAtRowAndColumn(targetRow, targetCol, newValue);
    }
  }

  /**
   * Used for undo
   * @param {number} row
   * @param {number} col
   */
  dethrone(row: number, col: number){
    let square = this.squares[rowCol2Square(row, col)];
    square.dethrone();
  }

  pieceTypeKingRow(pieceType: PieceType): number {
    return this.pieceTypeMovesUp(pieceType) ? 0 : 7;
  }

  pieceTypeHomeRow(pieceType: PieceType): number {
   return this.pieceTypeMovesUp(pieceType) ? 7 : 0;
  }

}

export class Player {
  pieceType: PieceType;
  strategy: string;
  resigned: boolean;

  constructor(pieceType: PieceType, strategy: string, resigned: boolean = false) {
    this.pieceType = pieceType;
    this.strategy = strategy;
    this.resigned = resigned;
  }

  serialize(): Object {
    return sr.shallowClone(this);
  }

  static create(data: sr.StringKeyedObject) : Player {
     return new Player(data['pieceType'], data['strategy'], data['resigned']);
  }

  hasNoPieces(board: Board){
    return board.getPieceCount(this.pieceType) === 0;
  }

  hasMoves(board: Board){
    return board.pieceTypeHasMove(this.pieceType);
  }

  getPossibleMoves(board: Board): Array<Move> {
    return board.getPossibleMovesByPieceType(this.pieceType);
  }

  getPossibleJumpMoveChains(board: Board): Array<SingleJumpMove>{
    const moves = this.getPossibleMoves(board);
    let result = moves.filter( move => move.capturesMultiplePieces());
    return result.map(move => move as SingleJumpMove);
  }
}





function createLegacyJumpMoveChain(data: sr.StringKeyedObject){
  const moves: Array<SingleJumpMove> = data['moves'].map((moveData: sr.StringKeyedObject) => SingleJumpMove.create(moveData));
  let previous: SingleJumpMove | null = null;
  moves.forEach( move => {
    move._nextJump = previous;
    previous = move;
  });
  sr.assert(!!moves[0].getNextJump());
  return moves[0];
}



export class MoveFactory {
  static create(data: sr.StringKeyedObject) : Move {
    let move: Move;
    // hack
    switch (data['type']){
      case 'SimpleMove':
        move = SimpleMove.create(data);
      break;
      case 'SingleJumpMove':
        move = SingleJumpMove.create(data);
      break;
      case 'JumpMoveChain':
        // Old data format
        move = createLegacyJumpMoveChain(data);
      break;
      default:
        throw 'unknown move class'
    }
    return move;
  }
}
