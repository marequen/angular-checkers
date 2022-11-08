import { Inject, Injectable } from '@angular/core';
import { theGame, Game } from "../engine/checkers"

@Injectable({
  providedIn: 'root'
})
export class GameService {
  
  getGame(): Game {
    return theGame;
  }

}