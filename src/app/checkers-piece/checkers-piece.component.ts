import { Component, Input, OnChanges, OnInit } from '@angular/core';
import {SquareValue} from '../../checkersBase'

@Component({
  selector: 'app-checkers-piece',
  templateUrl: './checkers-piece.component.html',
  styleUrls: ['./checkers-piece.component.css']
})
export class CheckersPieceComponent implements OnInit {
  @Input() value: SquareValue = 0;

  svgName: string = 'black';

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(): void {
    this.setPieceSvgName()
  }
  
  setPieceSvgName(){
    const svgsPerSquareType = {
      [SquareValue.BLACK] : 'black_piece.svg',
      [SquareValue.BLACK_KING]:'black_king.svg',
      [SquareValue.RED]:'red_piece.svg',
      [SquareValue.RED_KING]:'red_king.svg'
    };
  
    const svg = svgsPerSquareType[this.value];
    if (svg){
      this.svgName = svg
    }
  }

}
