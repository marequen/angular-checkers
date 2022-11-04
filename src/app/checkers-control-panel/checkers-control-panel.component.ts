import { Component, EventEmitter, OnInit, Output } from '@angular/core';

@Component({
  selector: 'app-checkers-control-panel',
  templateUrl: './checkers-control-panel.component.html',
  styleUrls: ['./checkers-control-panel.component.css']
})
export class CheckersControlPanelComponent implements OnInit {

  @Output() resign = new EventEmitter();
  @Output() restart = new EventEmitter();


  constructor() { }

  ngOnInit(): void {
  }

}
