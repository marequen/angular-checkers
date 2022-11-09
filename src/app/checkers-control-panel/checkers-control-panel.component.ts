import { Component, OnInit } from '@angular/core';
import { theGame } from '../../engine/checkers';

@Component({
  selector: 'app-checkers-control-panel',
  templateUrl: './checkers-control-panel.component.html',
  styleUrls: ['./checkers-control-panel.component.css']
})
export class CheckersControlPanelComponent implements OnInit {

  constructor() { }

  ngOnInit(): void {
  }

  onResign(){
    if (confirm("Resign?")) {
      theGame.resign();
    }
  }

  onRestart(){
    if (theGame.finished() || confirm("Restart?")) {
      theGame.restart(true);
    }
  }


}
