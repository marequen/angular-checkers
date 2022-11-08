import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouterModule } from '@angular/router';
import { ReactiveFormsModule } from '@angular/forms';

import { AppComponent } from './app.component';
import { ProductListComponent } from './product-list/product-list.component';
import { ProductAlertsComponent } from './product-alerts/product-alerts.component';
import { CheckersMainComponent } from './checkers-main/checkers-main.component';
import { CheckersControlPanelComponent } from './checkers-control-panel/checkers-control-panel.component';
import { CheckersBoardComponent } from './checkers-board/checkers-board.component';
import { CheckersBoardSquareComponent } from './checkers-board-square/checkers-board-square.component';
import { CheckersBoardRowComponent } from './checkers-board-row/checkers-board-row.component';
import { CheckersPieceComponent } from './checkers-piece/checkers-piece.component';

@NgModule({
  imports: [
    BrowserModule,
    ReactiveFormsModule,
    RouterModule.forRoot([
      { path: '', component: ProductListComponent },
    ])
  ],
  declarations: [
    AppComponent,
    ProductListComponent,
    ProductAlertsComponent,
    CheckersMainComponent,
    CheckersControlPanelComponent,
    CheckersBoardComponent,
    CheckersBoardSquareComponent,
    CheckersBoardRowComponent,
    CheckersPieceComponent
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