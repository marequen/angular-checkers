import { Component, OnInit } from '@angular/core';
import {MatDialog} from '@angular/material/dialog';
import { theGame } from '../../engine/checkers';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-checkers-control-panel',
  templateUrl: './checkers-control-panel.component.html',
  styleUrls: ['./checkers-control-panel.component.css']
})
export class CheckersControlPanelComponent implements OnInit {

  constructor(public dialog: MatDialog) { }

  ngOnInit(): void {
  }

  onResign(){
    this.openConfirmDialog("Resign?", ()=>{
      theGame.resign();
    })
  }

  onRestart(){
    if (theGame.finished()) {
      theGame.restart(true);
    } else {
      this.openConfirmDialog("Restart game?", ()=>{
        theGame.restart(true);
      })
    }
  }

  openConfirmDialog(message: string, onConfirmCallback: ()=>void) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '250px',
      data: {message: message},
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === true){
        console.log('The dialog was confirmed');
        onConfirmCallback();
      }
    });
  }

}
