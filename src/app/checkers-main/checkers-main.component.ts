import { Component, OnInit } from '@angular/core';
import { theGame } from '../../engine/checkers';
import { Square, SquareValue } from "../../engine/checkersBase";
import { SquarePlus } from "../squarePlus";

@Component({
  selector: 'app-checkers-main',
  templateUrl: './checkers-main.component.html',
  styleUrls: ['./checkers-main.component.css']
})
export class CheckersMainComponent implements OnInit {
  restart = false;
  resign = false;
  progress: number = 0;

  constructor() { 
    theGame.progressCallback = this.onProgress.bind(this);
    //theGame.moveFinishedCallback = this.onMoveFinished.bind(this);
  }

  ngOnInit(): void {
    theGame.start();
  }

  onResign(){
window.alert('OnResign');
this.resign = true;
  }

  onRestart(){
window.alert('OnRestart')
this.restart = true;
  }

  onProgress(p:number){
    this.progress = p * 100;
  }
  onMoveFinished(){

  }

}
