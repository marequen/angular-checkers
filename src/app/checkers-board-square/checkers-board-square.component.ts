import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { BoardLocation, Square, SquareValue } from '../../engine/checkersBase';

@Component({
  selector: 'app-checkers-board-square',
  templateUrl: './checkers-board-square.component.html',
  styleUrls: ['./checkers-board-square.component.css']
})

export class CheckersBoardSquareComponent implements OnInit {

  static dummySquare = new Square(SquareValue.EMPTY, new BoardLocation(0,0));

  @Input() square: Square = CheckersBoardSquareComponent.dummySquare;

  color: string = '';

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(): void {
    this.color = 'square color' + this.square.color;
  }

}
