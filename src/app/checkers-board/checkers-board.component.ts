import { AfterViewInit, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { SquarePlus } from "../squarePlus";
import { StringKeyedObject } from "../../engine/sr";
import { BoardLocation } from "../../engine/checkersBase";
import { Game } from "../../engine/checkers";
import { Move, SingleJumpMove, SimpleMove } from "../../engine/move"
import { GameService } from "../gameService";
import * as domUtils from "../../engine/domUtils";

@Component({
  selector: 'app-checkers-board',
  templateUrl: './checkers-board.component.html',
  styleUrls: ['./checkers-board.component.css'],
  providers: [
    GameService
  ]
})

export class CheckersBoardComponent implements OnInit, AfterViewInit {
  boardStyle: StringKeyedObject = {};

  rows: Array< Array<SquarePlus> > = [];

  activePiece: BoardLocation | null = null;
  selectedSquares: Array<BoardLocation> = [];
  highlightedSquares: Array<BoardLocation> = [];
  waitingToSelectAdditionalSquares: boolean = false;
  gPlayerPossibleJumpChains: Array<SingleJumpMove> = [];
  animationPromiseResolver: any | null = null;

  game: Game;

  constructor(private cdr: ChangeDetectorRef, gameService: GameService) { 
    this.game = gameService.getGame();
    this.game.addEventListener('boardInitialized', this.onBoardInitialized.bind(this));
    this.game.addEventListener('moveFinished', this.onMoveFinished.bind(this));

    let theBoard = this.game.getBoard();
    theBoard.animatePieceCallback = this.onAnimatePiece.bind(this);
    theBoard.redrawSquareCallback = this.onRedrawSquare.bind(this);
    this.cdr = cdr;
  }

  onBoardInitialized(){
    this.gPlayerPossibleJumpChains = this.game.player.getPossibleJumpMoveChains(this.game.getBoard());

    this.rows = [];
    for (let i = 0; i < 8; i++) {
      let row: Array<SquarePlus> = [];
      for (let col = 0; col < 8; col++) {
        let piece = this.game.getBoard().whatsAtRowColumn(i, col);
        row.push(new SquarePlus(piece));
      }
      this.rows.push(row)
    }
  }

  onAnimatePiece(square: BoardLocation, pieceElement: HTMLElement, left: number, top: number) : Promise<void> {

    return new Promise<void>((resolve, reject)=>{
      let piece = this.getSquare(square);
      piece.animationData = {left:left, top:top};
      this.cdr.detectChanges();
      this.animationPromiseResolver = resolve;
    });

  }

  onRedrawSquare(square: BoardLocation){
    let piece = this.game.getBoard().whatsAtRowColumn(square.row, square.col);
    this.rows[square.row][square.col] = new SquarePlus(piece);

    // Since we land here via a callback, Angular doesn't get a change to run
    // change detection, so we force it.
    // Thanks to: https://blog.angular-university.io/how-does-angular-2-change-detection-really-work/
    this.cdr.detectChanges();
  }

  onMoveFinished(){
    // Variables to make legacy code happy
    let theGame = this.game;
    let theBoard = this.game.getBoard();

    this.gPlayerPossibleJumpChains = theGame.player.getPossibleJumpMoveChains(theBoard);
    this.unhighlightSquares();
  }

  ngOnInit(): void {
  }

  ngAfterViewInit() {
    this.sizeBoard();
    window.onresize = this.sizeBoard.bind(this);
  }

  onRowAnimationDone(loc: BoardLocation){
    if (this.animationPromiseResolver){
      this.animationPromiseResolver();
      this.animationPromiseResolver = null;
    }
  }

  onSquareClicked(loc: BoardLocation){

    // Variables to make legacy code happy
    let theGame = this.game;
    let theBoard = this.game.getBoard();
    let square = loc;
    let targetRow = loc.row;
    let targetCol = loc.col;

    if (theGame.busy) return;
  
    let thing = theBoard.whatsAtRowColumn(targetRow, targetCol);
  
   // if (theGame.getAiVsAi()){
   //   onSquareClickedAiVsAi(square, thing);
   //   return;
   // }
    if (thing.isEmpty() === false){
      if (thing.pieceType() !== theGame.player.pieceType) return;
      this.setActivePiece(loc);
    }

    if (this.activePiece){
      let pieceRow = this.activePiece.row;
      let pieceCol = this.activePiece.col;
  
      if (!this.waitingToSelectAdditionalSquares){
        if (this.gPlayerPossibleJumpChains.length){
          let squares = this.selectedSquares.concat(new BoardLocation(targetRow, targetCol));
          let selectedChain = this.gPlayerPossibleJumpChains.find( chain => CheckersBoardComponent.isActiveChain(squares, chain));
          if (selectedChain){
             //+++ why are we pushing same location again?
             this.selectedSquares.push(new BoardLocation(targetRow, targetCol));
             this.highlightSquare(square);
             this.waitingToSelectAdditionalSquares = true;
             return;
          }
        }
        const distanceX = Math.abs(targetRow - pieceRow);
        const distanceY = Math.abs(targetCol - pieceCol);
        let playerMove: Move | null = null;
        if (distanceX === distanceY){
          if (distanceX === 2){
            playerMove = new SingleJumpMove(pieceRow, pieceCol, targetRow, targetCol);
          } else if (distanceX === 1) {
            playerMove = new SimpleMove(pieceRow, pieceCol, targetRow, targetCol);
          }
        }
  
        if (playerMove) {
          const moveResult = theGame.move(playerMove);
          if (moveResult.ok) {
            this.clearActivePiece();
            this.unhighlightForcedJumpMoves();
          } else {
            this.highlightForcedJumpMoves(moveResult.forcedJumpMoves);
          }
        }
      } else {
        let squares = this.selectedSquares.concat(new BoardLocation(targetRow, targetCol));
        let selectedChain = this.gPlayerPossibleJumpChains.find( chain => CheckersBoardComponent.isActiveChain(squares, chain));
        if (selectedChain){
          if (selectedChain.capturedPieces().length === squares.length){
            const moveResult = theGame.move(selectedChain);
            if (moveResult.ok){
              this.clearActivePiece();
              this.waitingToSelectAdditionalSquares = false;
              this.unhighlightSquares();
              this.selectedSquares = [];
              this.unhighlightForcedJumpMoves();
            } else {
              this.highlightForcedJumpMoves(moveResult.forcedJumpMoves);
            }
          } else {
            this.selectedSquares.push(new BoardLocation(targetRow, targetCol));
            this.highlightSquare(square);
            return;
          }
        }
      }
    }
  }

  getSquare(loc: BoardLocation): SquarePlus {
    return this.rows[loc.row][loc.col];
  }

  forEachSquare( f: (s: SquarePlus) => void ): void {
    for (let row of this.rows){
      for (let squarePlus of row){
        f(squarePlus);
      }
    }
  }

  setActivePiece(p: BoardLocation){
    this.clearActivePiece();
    this.activePiece = p;
    let s = this.getSquare(p);
    s.active = true;
  }

  clearActivePiece(){
    if (this.activePiece){
      let s = this.getSquare(this.activePiece);
      s.active = false;
    }
    this.activePiece = null;
  }

  highlightSquare(s: BoardLocation){
    this.getSquare(s).highlighted = true;
  }

  unhighlightSquares(){
    this.forEachSquare( s => s.highlighted = false)
  }

  highlightForcedJumpMoves(moves: Array<Move>){

    moves.forEach( move => {
      move.capturedPieces().forEach( piece => {
        let square = this.getSquare(piece);
        square.forcedJump = true;
      })
    })
  }

  unhighlightForcedJumpMoves(){
    this.forEachSquare( s => s.forcedJump = false)
  }

  static isActiveChain(squares: Array<BoardLocation>, chain: SingleJumpMove) : boolean {
    let jumpMoveSegment: SingleJumpMove | null = chain;
    for (let square of squares){
      if (!jumpMoveSegment){
        return false;
      }
      if (square.row !== jumpMoveSegment.targetRow || square.col !== jumpMoveSegment.targetCol){
        return false;
      }
      jumpMoveSegment = jumpMoveSegment.getNextJump()
    }
    return true;
  }

  static calcBoardExtent(){
    let top =  domUtils.getElementByIdOrThrow('mainContentRow');
    let topContentSize = domUtils.elementContentSize(top);
    let boardContainer =  domUtils.getElementByIdOrThrow('boardContainer');
    let boardContainerSize = domUtils.elementContentSize(boardContainer);
    let extent;
    if (topContentSize.contentHeight > topContentSize.contentWidth){
      // portrait
      extent = Math.min(boardContainerSize.contentHeight, boardContainerSize.contentWidth);
      console.log('calcBoardExtent', extent, boardContainerSize);

    } else {
      // landscape (or square)
      extent = Math.min(boardContainerSize.contentHeight, topContentSize.contentWidth);
    }
    return Math.floor(extent);
  }

  sizeBoard(){
    let boardExtent = CheckersBoardComponent.calcBoardExtent();
    if (boardExtent > 0){
      let boardExtentS = boardExtent + 'px';
      this.boardStyle = {
        width: boardExtentS, height: boardExtentS
      }
    }

  }

}
