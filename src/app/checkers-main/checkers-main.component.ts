import { Component, OnInit } from '@angular/core';
import { theGame, theBoard } from '../../checkers';
import { Square, SquareValue } from "../../checkersBase";

@Component({
  selector: 'app-checkers-main',
  templateUrl: './checkers-main.component.html',
  styleUrls: ['./checkers-main.component.css']
})
export class CheckersMainComponent implements OnInit {
  restart = false;
  resign = false;
  rows: Array< Array<Square> > = [];

  constructor() { 

  }

  ngOnInit(): void {
    this.initializeBoard();
    theGame.start();
  }

  onResign(){
window.alert('OnResign');
this.resign = true;
  }

  onRestart(){
window.alert('OnRestart')
this.restart = true;
  }

  initializeBoard() {
    this.rows = [];
    for (let i = 0; i < 8; i++) {
      let row: Array<Square> = [];
      for (let col = 0; col < 8; col++) {
        let piece = theGame.getBoard().whatsAtRowColumn(i, col);
        row.push(piece);
      }
      this.rows.push(row)
    }
    /*
    const bc = getElementByIdOrThrow('boardContainer');
    bc.innerHTML = theBoard.draw();
  
    const squares = document.querySelectorAll('.square.color1');
    squares.forEach(square => {
      square.addEventListener('click', onSquareClicked)
    });
    */
  }

}
