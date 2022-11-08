/// <reference lib="webworker" />

import {Evaluator, TopLevelTask} from '../engine/evaluator'

import * as srCheckers from '../engine/checkersBase';
import { BoardLocation} from '../engine/checkersBase';

type StringKeyedObject = { [key: string]: any };

self.addEventListener('message', onMessage);

function onMessage(e: StringKeyedObject){
  let player: srCheckers.Player;
  let board: srCheckers.Board;
  let evaluator, debugPiece;
  switch (e['data']['message']){
    case 'startEvaluation':
      player = srCheckers.Player.create(e['data']['player']);
      board = srCheckers.Board.create(e['data']['board']);
      evaluator = new Evaluator(new TopLevelTask(onProgress), player.strategy);
      evaluator.log = true;
      if (e['data']['debugPiece']){
        debugPiece = BoardLocation.create(e['data']['debugPiece']);
        evaluator.debugPiece(debugPiece);
      }
      evaluator.startEvaluation(board, player)
      .then( future => {
        let move = future.move && future.move.serialize();
        let projectedOpponentMove = future.projectedOpponentMove && future.projectedOpponentMove.serialize();
        let description = future.toString();
        self.postMessage({
          message:'moveDone',
          player: player.pieceType,
          move: move,
          projectedOpponentMove: projectedOpponentMove,
          future:description
        });
      })
      break;
    case 'drawRequest':
      player = srCheckers.Player.create(e['data']['player']);
      board = srCheckers.Board.create(e['data']['board']);
      evaluator = new Evaluator(new TopLevelTask(onProgress), player.strategy);
      evaluator.log = true;
      evaluator.startEvaluation(board, player)
        .then( future => {
          const dispositionChain = future.calculateDispositionChain();
          const noChanges = dispositionChain.every(d => d.hasChange() === false);
          let description = future.toString();
          self.postMessage({
            message:'drawResponse',
            player: player.pieceType,
            response: noChanges,
            future:description
          });
        })
      break;
  }
}

let previousProgress = -1;
function onProgress(p: number){
  let percentageInt = Math.floor(p * 100);
  if (percentageInt !== previousProgress){
    previousProgress = percentageInt;
    self.postMessage({message:'progress', value:p});
  }
}




