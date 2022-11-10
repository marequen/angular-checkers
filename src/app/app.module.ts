import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ReactiveFormsModule } from '@angular/forms';

import { MatDialogModule } from '@angular/material/dialog';

import { AppComponent } from './app.component';

import { CheckersMainComponent } from './checkers-main/checkers-main.component';
import { CheckersControlPanelComponent } from './checkers-control-panel/checkers-control-panel.component';
import { CheckersBoardComponent } from './checkers-board/checkers-board.component';
import { CheckersBoardSquareComponent } from './checkers-board-square/checkers-board-square.component';
import { CheckersBoardRowComponent } from './checkers-board-row/checkers-board-row.component';
import { CheckersPieceComponent } from './checkers-piece/checkers-piece.component';
import { ProgressBarComponent } from './progress-bar/progress-bar.component';
import { ConfirmDialogComponent } from './confirm-dialog/confirm-dialog.component';
import { AlertComponent } from './alert/alert.component';

@NgModule({
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    MatDialogModule,
    ReactiveFormsModule,
  ],
  declarations: [
    AppComponent,
    CheckersMainComponent,
    CheckersControlPanelComponent,
    CheckersBoardComponent,
    CheckersBoardSquareComponent,
    CheckersBoardRowComponent,
    CheckersPieceComponent,
    ProgressBarComponent,
    ConfirmDialogComponent,
    AlertComponent
  ],
  bootstrap: [
    AppComponent
  ]
})
export class AppModule { }


/*
Copyright Google LLC. All Rights Reserved.
Use of this source code is governed by an MIT-style license that
can be found in the LICENSE file at https://angular.io/license
*/