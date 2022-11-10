import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { BoardLocation, Square, SquareValue } from '../../engine/checkersBase';
import { SquarePlus } from "../squarePlus";


@Component({
  selector: 'app-checkers-board-square',
  templateUrl: './checkers-board-square.component.html',
  styleUrls: ['./checkers-board-square.component.css']
})

export class CheckersBoardSquareComponent implements OnInit {

  static dummySquare = new SquarePlus(new Square(SquareValue.EMPTY, new BoardLocation(0,0)));

  @Input() square: SquarePlus = CheckersBoardSquareComponent.dummySquare;
  @Output() animationDone = new EventEmitter;

  color: string = '';

  constructor() {
  }

  ngOnInit(): void {
  }

  ngOnChanges(): void {
    this.color = 'square color' + this.square.square.color;
  }

  onPieceAnimationDone(){
    this.animationDone.emit(this.square.square.loc);
  }

}
