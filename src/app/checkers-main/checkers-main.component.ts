import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import * as domUtils from '../../engine/domUtils';
import { theGame, GameState } from '../../engine/checkers';
import { Player , PieceType } from "../../engine/checkersBase";


@Component({
  selector: 'app-checkers-main',
  templateUrl: './checkers-main.component.html',
  styleUrls: ['./checkers-main.component.css']
})
export class CheckersMainComponent implements OnInit {

  progress: number = 0;
  showProgress: boolean = false;
  scoreMessage: string = '';
  boardExtent: string = '';

  constructor(private cdr: ChangeDetectorRef) { 
    theGame.progressCallback = this.onProgress.bind(this);
    theGame.addEventListener('moveFinished', this.onMoveFinished.bind(this));
    theGame.gameFinishedCallback = this.onGameFinished.bind(this);
  }

  ngOnInit(): void {
    theGame.start();
  }

  onProgress(p:number){
    this.progress = p * 100;
    this.showProgress = true;
    this.cdr.detectChanges();
  }

  onMoveFinished(){
    this.updateScore();
    this.showProgress = false;
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
      window.alert(message);
  }

  static playerToString(player: Player){
    let temp2 = [];
    temp2[PieceType.RED] = 'red';
    temp2[PieceType.BLACK] = 'black';
    const pieceColorString = temp2;

    const playerColor = pieceColorString[player.pieceType];
    return playerColor;
  }
  
  updateScore(){
    const theBoard = theGame.getBoard();

    this.scoreMessage = CheckersMainComponent.playerToString(theGame.player) + ': '
      + theBoard.getPieceCount(theGame.player.pieceType) + ' '
      + CheckersMainComponent.playerToString(theGame.opponent) + ': '
      + theBoard.getPieceCount(theGame.opponent.pieceType);
  }

}
