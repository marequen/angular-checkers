import { Component, Input, OnInit } from '@angular/core';
import {Square} from "../../checkersBase";

@Component({
  selector: 'app-checkers-board-row',
  templateUrl: './checkers-board-row.component.html',
  styleUrls: ['./checkers-board-row.component.css']
})
export class CheckersBoardRowComponent implements OnInit {

  @Input() iPieces: Array<Square> = [];

  constructor() { }

  ngOnInit(): void {
  }

}
