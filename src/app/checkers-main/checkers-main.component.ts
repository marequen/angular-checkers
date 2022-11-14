import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';

import { theGame, GameState } from '../../engine/checkers';
import { Player , PieceType, pieceColorString } from "../../engine/checkersBase";
import { AlertComponent } from '../alert/alert.component';

@Component({
  selector: 'app-checkers-main',
  templateUrl: './checkers-main.component.html',
  styleUrls: ['./checkers-main.component.css']
})
export class CheckersMainComponent implements OnInit {

  instructionsOpacity: number = 1;
  playerColor: string = '';
  progress: number = 0;
  progressOpacity: number = 0;
  scoreMessage: string = '';

  constructor(private cdr: ChangeDetectorRef, public dialog: MatDialog) { 
    theGame.progressCallback = this.onProgress.bind(this);
    theGame.addEventListener('moveFinished', this.onMoveFinished.bind(this));
    theGame.gameFinishedCallback = this.onGameFinished.bind(this);
    theGame.showAlertCallback = this.openAlert.bind(this);
    theGame.addEventListener('boardInitialized', this.onBoardInitialized.bind(this));
  }

  ngOnInit(): void {
    // this.syncUiToGame();
    theGame.setWorker(
new Worker(new URL('../checkers.worker', import.meta.url)));
    theGame.start();
  }

  onBoardInitialized(){
    this.syncUiToGame()
  }

  onProgress(p:number){
    this.progress = p * 100;
    this.showProgressMeter();
    this.cdr.detectChanges();
  }

  onMoveFinished(){
    this.updateScore();
    this.hideProgressMeter();
  }

  onGameFinished(loser: Player | null, reason: GameState){
      let scoreMessage = '';
      let message = '';
      if (loser === theGame.player){
        scoreMessage = 'You lost.';
        switch (reason){
          case GameState.GAME_OVER_RESIGNED:
            scoreMessage = 'You resigned.';
            message = 'Good Game. '
            break;
          case GameState.GAME_OVER_NO_MOVES:
            message = "You have no more moves. ";
            break;
        }
        message += "Better luck next time.";
      } else if (loser === theGame.opponent) {
        scoreMessage = 'You won';
        switch (reason){
          case GameState.GAME_OVER_NO_MOVES:
            message = "I have no more moves. "
            break;
          case GameState.GAME_OVER_RESIGNED:
            message = "I resign. "
            break;
          default:
            message = 'You win. ';
        }
        message += 'Congratulations!'
      } else {
        message += "It's a draw. Good game."
      }
      this.scoreMessage = scoreMessage;
      this.openAlert(message);
  }

  showProgressMeter(){
    this.progressOpacity = 1;
    this.instructionsOpacity = 0;
  }
  hideProgressMeter(){
    this.progressOpacity = 0;
    this.instructionsOpacity = 1;
  }

  syncUiToGame(){
    const setPlayerColorText = ()=>{
      this.playerColor = pieceColorString[theGame.player.pieceType]
    }
    const showInstructionsIfPlayerMovesFirst = () => {
      if (theGame.player.pieceType === PieceType.BLACK){
        this.instructionsOpacity = 1;
      }
    }
    setPlayerColorText();
    showInstructionsIfPlayerMovesFirst();
    this.updateScore();
  }
  
  updateScore(){
    const theBoard = theGame.getBoard();

    this.scoreMessage = pieceColorString[theGame.player.pieceType] + ': '
      + theBoard.getPieceCount(theGame.player.pieceType) + ' '
      + pieceColorString[theGame.opponent.pieceType] + ': '
      + theBoard.getPieceCount(theGame.opponent.pieceType);
  }

  openAlert(message: string) {
    const dialogRef = this.dialog.open(AlertComponent, {
      width: '250px',
      data: {message: message},
    });
  }
}
