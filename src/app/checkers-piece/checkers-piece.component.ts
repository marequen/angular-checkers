import { Component, Input, OnChanges, OnInit } from '@angular/core';
import {
  trigger,
  state,
  style,
  animate,
  transition,
  // ...
} from '@angular/animations';
import {SquareValue} from '../../engine/checkersBase'

@Component({
  selector: 'app-checkers-piece',
  templateUrl: './checkers-piece.component.html',
  styleUrls: ['./checkers-piece.component.css'],
  animations: [
    trigger('openClose', [
      // ...
      state('open', 
        style({
          left: '{{left}}px',
          top: '{{top}}px',
        }),
        {
          params:{ left: 0, top:0}
        }
      ),

      state('closed', style({

      })),
      transition('open => closed', [
        animate('1s')
      ]),
      transition('closed => open', [
        animate('0.5s')
      ]),
    ]),
  ]
})
export class CheckersPieceComponent implements OnInit {
  @Input() value: SquareValue = 0;
  @Input() active: boolean = false;
  @Input() animationData: { top: number, left: number} | null = null;

  svgName: string = 'black';
  className: string = '';
  isOpen: boolean = false;

  constructor() { }

  ngOnInit(): void {
  }

  ngOnChanges(): void {
    this.setPieceSvgName()
  }

  toggle(){
    this.isOpen = !this.isOpen;
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
