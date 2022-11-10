import { Component, EventEmitter, Input, OnInit, Output, SimpleChanges } from '@angular/core';
import { SquarePlus } from "../squarePlus";
import { BoardLocation } from "../../engine/checkersBase";

@Component({
  selector: 'app-checkers-board-row',
  templateUrl: './checkers-board-row.component.html',
  styleUrls: ['./checkers-board-row.component.css']
})
export class CheckersBoardRowComponent implements OnInit {

  @Input() iPieces: Array<SquarePlus> = [];
  @Output() squareClicked: EventEmitter<BoardLocation> = new EventEmitter();

  constructor() { }

  ngOnInit(): void {
  }

}
