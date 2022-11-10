import {Move, SimpleMove, SingleJumpMove} from "./move";
import {BoardLocation, Square} from "./checkersBase";
import * as srCheckers from "./checkersBase";
import {Board, _getPieceContainerElement } from "./checkers";
import * as domUtils from "./domUtils";

export class Animator {

  static execute(board: Board, move: Move){
    if (move instanceof SimpleMove){
      return Animator.executeSimpleMove(board, move);
    } else if (move instanceof SingleJumpMove){
      return Animator.executeJumpMoveChain(board, move);
    }
    return Promise.reject('Unknown move type');
  }
  static undo(board: Board, move: Move): Promise<Square> {
    if (move instanceof SimpleMove){
      return Animator.undoSimpleMove(board, move);
    } else if (move instanceof SingleJumpMove){
      return Animator.undoJumpMoveChain(board, move);
    }
    return Promise.reject('Unknown move type');
  }

  static executeSimpleMove(board: Board, move: Move){
    if (!board.isValidMove(move)){
      return Promise.reject('invalid move');
    }

    const wasKing = board.whatsAtRowColumn(move.startRow, move.startCol).isKing();
    return Animator._movePiece(board, move.startRow, move.startCol, move.targetRow, move.targetCol)
      .then( movedPiece =>{
          move.kinged = !wasKing && movedPiece.isKing(); // Needed for undo
          board.redrawSquare(move.startRow, move.startCol);
          board.redrawSquare(move.targetRow, move.targetCol);
          return Promise.resolve();
      })
  }

  static undoSimpleMove(board: Board, move: Move){
    return Animator._movePiece(board, move.targetRow, move.targetCol, move.startRow, move.startCol)
      .then( _movedPiece =>{
          if (move.kinged){
            board.dethrone(move.startRow, move.startCol);
          }
          move.kinged = false;
          board.redrawSquare(move.startRow, move.startCol);
          board.redrawSquare(move.targetRow, move.targetCol);
          return Promise.resolve( _movedPiece );
      })
  }

  static executeSingleJumpMoveSegment(board: Board, move: SingleJumpMove) : Promise<Square> {
    if (!board.isValidMove(move)){
      return Promise.reject('invalid move');
    }

    const wasKing = board.whatsAtRowColumn(move.startRow, move.startCol).isKing();
    return Animator._movePiece(board, move.startRow, move.startCol, move.targetRow, move.targetCol)
      .then( movedPiece =>{
          move.kinged = !wasKing && movedPiece.isKing(); // Needed for undo

          board.redrawSquare(move.startRow, move.startCol);
          board.redrawSquare(move.targetRow, move.targetCol);

          const jumpPiece = move.getJumpedPiece(board);
//          sr.assert(jumpPiece, `no jumped piece`);
          move.jumpedPieceWasKing = jumpPiece.isKing();

          board.capturePieceAtRowAndColumn(move.jumpRow, move.jumpCol);
          board.redrawSquare(move.jumpRow, move.jumpCol);
          return Promise.resolve(movedPiece);
      })
  }

  static undoSingleJumpMoveSegment(board: Board, move: SingleJumpMove): Promise<Square> {
    return Animator._movePiece(board, move.targetRow, move.targetCol, move.startRow, move.startCol)
      .then( movedPiece =>{
          if (move.kinged){
            board.dethrone(move.startRow, move.startCol);
          }
          move.kinged = false;
          board.redrawSquare(move.startRow, move.startCol);
          board.redrawSquare(move.targetRow, move.targetCol);

          const opponentType = srCheckers.opponentPieceType[movedPiece.pieceType() as number];
          board.uncapturePiece(opponentType, move.jumpRow, move.jumpCol, move.jumpedPieceWasKing);
          board.redrawSquare(move.jumpRow, move.jumpCol);
          return Promise.resolve(movedPiece);
      })
  }
  
  static undoJumpMoveChain(board: Board, move: SingleJumpMove): Promise<Square> {
    let segments: Array<SingleJumpMove> = [];
    move.forEachMove( moveSegment => segments.push(moveSegment));
    return Animator._undoMultiJumpMoveSegments(board, segments);
  }

  static executeJumpMoveChain(board: Board, move: SingleJumpMove) : Promise<void> {
    if (move){
      //+++ Game._loadGame solves a similar problem using reduce
      return Animator.executeSingleJumpMoveSegment(board, move).then( () => {
        //+++ This was wonky before. Had no check for null
        let nextJump = move.getNextJump();
        if (nextJump === null) return Promise.resolve();
        return Animator.executeJumpMoveChain(board, nextJump);
      })
    } else {
      return Promise.resolve();
    }
  }

  static _undoMultiJumpMoveSegments(board: Board, moves: Array<SingleJumpMove>): Promise<Square> {
    let move = moves.pop();
    if (move){
      return Animator.undoSingleJumpMoveSegment(board, move).then(  movedPiece => {
        if (moves.length === 0){
          return movedPiece;
        }
        return Animator._undoMultiJumpMoveSegments(board, moves);
      })
    } else {
      return Promise.reject('no move segments');
    }
  }

  static _movePiece(board: Board, startRow: number, startCol: number, row: number, col: number): Promise<Square> {
    return new Promise(resolve => {
      // get the piece element
      const pieceSelector = `.square[data-row="${startRow}"][data-col="${startCol}"] img`;
      let pieceElement = document.querySelector(pieceSelector) as HTMLElement;

      // get coordinates of the piece
      let pieceOffset = domUtils.srOffset(pieceElement);

      // get the destination square element
      let destSquareElement = _getPieceContainerElement(row, col);

      // get coordinates of destination
      let destSquareOffset = domUtils.srOffset(destSquareElement as HTMLElement);

      let leftMove = destSquareOffset.left - pieceOffset.left;
      let topMove = destSquareOffset.top - pieceOffset.top;

      const onPieceMoveDone = ()=>{
        const wasKing = board.whatsAtRowColumn(startRow, startCol).isKing();
        board.movePieceFromTo(startRow, startCol, row, col);
        let movedPiece = board.whatsAtRowColumn(row, col);
        if (wasKing !== movedPiece.isKing()){
         board.redrawSquare(row, col);
        }
        resolve(movedPiece);
      }

      if (board.animatePieceCallback){
        board.animatePieceCallback(new BoardLocation(startRow, startCol), pieceElement, leftMove, topMove).then( onPieceMoveDone );
      } else {
        onPieceMoveDone();
      }

    })

  }
}