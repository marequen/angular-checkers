import { Component, Input, OnChanges, OnInit } from '@angular/core';
import {SquareValue} from '../../engine/checkersBase'

@Component({
  selector: 'app-checkers-piece',
  templateUrl: './checkers-piece.component.html',
  styleUrls: ['./checkers-piece.component.css']
})
export class CheckersPieceComponent implements OnInit {
  @Input() value: SquareValue = 0;
  @Input() active: boolean = false;

  svgName: string = 'black';
  className: string = '';

  constructor() { }

  ngOnInit(): void {
    console.log('piece init')
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
      this.svgName = svg;
      this.className = 'pieceSvg';
      if (this.active){
        this.className += ' active';
      }
    }
  }

}
