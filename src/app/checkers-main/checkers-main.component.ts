import { Component, OnInit } from '@angular/core';
import { theGame } from '../../engine/checkers';
import { Square, SquareValue } from "../../engine/checkersBase";
import { SquarePlus } from "../squarePlus";

@Component({
  selector: 'app-checkers-main',
  templateUrl: './checkers-main.component.html',
  styleUrls: ['./checkers-main.component.css']
})
export class CheckersMainComponent implements OnInit {
  restart = false;
  resign = false;
  rows: Array< Array<SquarePlus> > = [];

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
      let row: Array<SquarePlus> = [];
      for (let col = 0; col < 8; col++) {
        let piece = theGame.getBoard().whatsAtRowColumn(i, col);
        row.push(new SquarePlus(piece));
      }
      this.rows.push(row)
    }
  }

}
