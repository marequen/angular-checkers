import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
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
  showProgress: boolean = false;

  constructor(private cdr: ChangeDetectorRef) { 
    theGame.progressCallback = this.onProgress.bind(this);
    theGame.addEventListener('moveFinished', this.onMoveFinished.bind(this));
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
    this.showProgress = true;
    this.cdr.detectChanges();
  }

  onMoveFinished(){
    this.showProgress = false;
  }

}
