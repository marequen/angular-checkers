import { Component, Input, OnInit } from '@angular/core';
import { BoardLocation, Square, SquareValue } from "../../engine/checkersBase";

@Component({
  selector: 'app-checkers-board',
  templateUrl: './checkers-board.component.html',
  styleUrls: ['./checkers-board.component.css']
})
export class CheckersBoardComponent implements OnInit {

  @Input() iRestart = false;
  @Input() iResign = false;
  @Input() iRows: Array< Array<Square> > = [];

  rows = [0,1,2,3,4,5,6,7];
  cols = [0,1,2,3,4,5,6,7];

  constructor() { 
  }

  ngOnInit(): void {
  }
  restart(){
    window.alert('board restart')
  }
  resign(){
    window.alert('board resign')
  }

}
