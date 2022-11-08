import {Board, BoardLocation, opponentPieceType, PieceType} from "./checkersBase";
import * as srCheckers from "./checkersBase";
import {
  Assessment,
  Disposition,
  IAssessmentAndDispositionVisitor,
  IFuture,
  IPreAndPostAssessmentVisitor,
  IStrategy
} from "./strategyBase";
import * as sr from "./sr";
import {strategyFactory} from "./strategies";
import {Move} from "./move";

const maxMovesAhead = 6;
const DEBUG = false;

export class Evaluator {
  task: RecursiveTask;
  log : boolean;
  debugLoc: BoardLocation | null;

  constructor(task: RecursiveTask, strategy: string) {
    this.task = task;
    this.log = false;
    this.debugLoc = null;
  }
  debugPiece(loc: BoardLocation){
    this.debugLoc = loc;
  }
  startEvaluation(board: Board, player: srCheckers.Player): Promise<Future> {
    this.task.reportProgress(0);
    let tStart = self.performance.now();

    const opponentPieceType = srCheckers.opponentPieceType[player.pieceType];

    let strategicPlayer = new Player(player.pieceType , player.strategy);
    let opponent        = new Player(opponentPieceType, player.strategy);

    return this.getBestFuture(this.task, board, strategicPlayer, opponent, 0)
      .then(future => {
        let tStop = self.performance.now();
        if (DEBUG){
          console.log(`Future eval took ${tStop - tStart}`);
        }
        return future;
      })
  }

  getBestFuture(parentTask: MultiStepTask | RecursiveTask,
                board: Board, player: Player, opponent: Player,
                movesAhead: number): Promise<Future> {
    let preMoveAssessment = player.assessBoard(board);
    let task = new RecursiveTask(parentTask);
    return this.evaluatePossibleMoves(board, task, player, opponent, preMoveAssessment, movesAhead);
  }

  evaluatePossibleMoves(board: Board, task: RecursiveTask,
                        player: Player, opponent: Player,
                        initialAssessment: Assessment, movesAhead: number): Promise<Future> {

    let moves = player.getPossibleMoves(board);
    if (movesAhead === 0 && this.debugLoc !== null){
      // @ts-ignore
      let debugMoves = moves.filter( move => move.startRow === this.debugLoc.row && move.startCol === this.debugLoc.col);
      if (debugMoves.length){
        moves = debugMoves;
      }
    }

    // Create a task so the _pickBestFuture work takes up room in the progress reporting
    let pickBestTask = new Task(task);
    task.registerChild(pickBestTask);

    initialAssessment.possibleMoves = moves.length;
    initialAssessment.possibleMovesAreJumps = moves[0].capturesPieces();

    if (movesAhead === 0 && moves.length === 1){
      // I.e., if the 'player' has only one move, then the only reason to bother
      // with subsequent Futures is to select the opponentFuture, which is only
      // used for the "I thought you were going to pick a different move" code.
      let f = new Future(player, opponent, initialAssessment);
      f.move = moves[0];
      pickBestTask.reportComplete();
      return Promise.resolve(f);
    }

    // Convert moves into evaluated Futures
    let futures = moves.map(move => {
      let multiStepTask = new MultiStepTask(task, maxMovesAhead - movesAhead);
      task.registerChild(multiStepTask);

      let f = new Future(player, opponent, initialAssessment);
      f.movesAhead = movesAhead;
      if (movesAhead === 0 && !!this.debugLoc){
        f.trace = true;
      }
      return f.evaluateMove(board.clone(), this, multiStepTask, move, movesAhead)
    });

    return Promise.all(futures).then( values => {

      // If a piece is captured
      let bestFuture = player.pickBestFuture(values);
      this._onBestFuturePicked(values, bestFuture, movesAhead);
      pickBestTask.reportComplete();
      return Promise.resolve(bestFuture);
    });
  }

  futureDebugString(future: Future): string {
    let notes = future.notes || '';

    const dispoChain = future.calculateDispositionChain();
    notes += '\n';
    let dispoChainDescription = sr.indentString(dispoChain.join('\n'), 4);
    notes += dispoChainDescription;

    const redOrBlack = srCheckers.pieceColorString[future.player.pieceType];
    return `${redOrBlack} ${future.player.strategy} move: ${future.move?.toString()} score: ${future.score} ${notes}\n`;
  }

  _onBestFuturePicked(futures: Array<Future>, bestFuture: Future, movesAhead: number){
    if (this.log && movesAhead < 2){
      let otherChoices = ' no other choices';
      if (futures.length > 1) {
        otherChoices = ' over \n';
        futures.forEach( f => {
          if (f !== bestFuture ) otherChoices += this.futureDebugString(f) + "\n"
        })
      }

      const opponentFutureDebugString = bestFuture.projectedOpponentFutureDebugString;
      if (DEBUG){
        let f = `Chose ${this.futureDebugString(bestFuture)}\n  ${otherChoices}\n oppo: ${opponentFutureDebugString}`;
        let fi = sr.indentString(f, movesAhead * 2);
        console.log(fi);
      }
    }
  }
}


class Task {
  parent: Task | null;
  pctComplete: number;
  reportPctCompleteThreshold: number;

  constructor(parent: Task | null) {
    this.parent = parent;
    this.pctComplete = 0;
    this.reportPctCompleteThreshold = 0;
  }

  onChildProgress(child: Task){
    sr.assert(false, 'subclass must override this function');
  }

  /**
   *
   * @param {number} p a number between [0 and 1]
   */
  reportProgress(p: number) {
    if (!Number.isFinite(p)) throw 'Parameter is not finite';
    if (p < 0 || p > 1) throw 'Parameter out of bounds';
    sr.assert(p >= this.pctComplete, 'pctComplete should not go down');

    this.pctComplete = p;

    // Only report if pctComplete is 1 or has gone up 5% from last time
    if (this.pctComplete >= this.reportPctCompleteThreshold){
      this.reportPctCompleteThreshold = Math.min(this.pctComplete + 0.05, 1.0);
      if (this.parent) {
        this.parent.onChildProgress(this);
      }
    }
  }

  reportComplete(){
    this.reportProgress(1);
  }
}

/**
 * A Task that performs a discrete series of steps
 */
class MultiStepTask extends Task {
  steps: number;
  stepsCompleted: number;

  constructor(parent: Task, steps: number) {
    super(parent);
    this.steps = steps;
    this.stepsCompleted = 0;
  }

  override onChildProgress(child: Task){
    this.reportProgress((this.stepsCompleted + child.pctComplete) / this.steps);
  }

  stepCompleted(){
    this.stepsCompleted++;
    this.reportProgress(this.stepsCompleted / this.steps);
  }
  override reportComplete(){
    this.stepsCompleted = this.steps;
    super.reportComplete();
  }
}

class MutableNumber {
  value: number;
  constructor(value: number) {
    this.value = value;
  }
}

/**
 * Not a great name. A Task that owns several sub-tasks
 */
class RecursiveTask extends Task {
  id: number;
  childTaskWeakMap: WeakMap<Task, MutableNumber>;
  childTasksPctComplete: Array<MutableNumber>;
  pctCompleteInvalid: boolean;

  constructor(parent: Task | null) {
    super(parent);
    this.id = -1;
    this.childTaskWeakMap = new WeakMap<Task, MutableNumber>();
    this.childTasksPctComplete = []; // We need this to call 'reduce' on. Hacky
    this.pctComplete = 0;
    this.pctCompleteInvalid = true;
  }

  registerChild(child: Task){
    if (!this.childTaskWeakMap.has(child)){
      let childPctComplete = new MutableNumber(0);
      this.childTasksPctComplete.push(childPctComplete);
      this.childTaskWeakMap.set(child, childPctComplete);
    }
  }

  override onChildProgress(child: Task){
    let childPctCompleteRef = this.childTaskWeakMap.get(child);
    sr.assert(childPctCompleteRef !== undefined, 'progress from unregistered child');
    if (childPctCompleteRef !== undefined) {
      this._onChildTaskProgress(childPctCompleteRef, child.pctComplete);
    }
  }

  _onChildTaskProgress(childPctCompleteRef:MutableNumber, pctComplete:number){
    const oldChildPctComplete = childPctCompleteRef.value;
    childPctCompleteRef.value = pctComplete;
    if (this.pctCompleteInvalid){
      const cumulativeComplete = this.childTasksPctComplete.reduce((a, b) => a + b.value, 0);
      this.pctComplete = cumulativeComplete / this.childTasksPctComplete.length;
      this.pctCompleteInvalid = true;
    } else {
      const delta = pctComplete - (oldChildPctComplete / this.childTasksPctComplete.length);
      this.pctComplete += delta;
    }

    this.reportProgress(this.pctComplete);
  }
}

/**
 * The TopLevelTask owns a single child task and forwards its progress via the global onProgress function
 */
export class TopLevelTask extends RecursiveTask {
  stepsCompleted: number;
  onProgress: (p:number)=>void;

  constructor(onProgress: (p:number)=>void) {
    super(null);
    this.stepsCompleted = 0; // for setting id of child task
    this.onProgress = onProgress;
  }

  override onChildProgress(child: Task) {
    const p = child.pctComplete;
    if (!Number.isFinite(p)) throw 'Parameter is not finite';
    if (p < 0 || p > 1) throw 'Parameter out of bounds';
    sr.assert(p >= this.pctComplete, 'pctComplete should not go down');
    this.pctComplete = p;
    this.onProgress(p);
  }

  override reportProgress(p: number){
    this.onProgress(p);
  }
}

class Player extends srCheckers.Player {
  strategyImpl: IStrategy;
  constructor(pieceType: PieceType, strategy: string) {
    super(pieceType, strategy);
    this.strategyImpl = strategyFactory(strategy);
  }
  assessBoard(board: Board):Assessment {
    return this.strategyImpl.assessBoard(board, this.pieceType);
  }
  assessBoardAfterMove(board: Board): Assessment {
    return this.strategyImpl.assessBoard(board, opponentPieceType[this.pieceType]);
  }
  pickBestFuture(futures: Array<Future>):Future{
    return this.strategyImpl.pickBestFuture(futures) as Future;
  }
}



class Future implements IFuture {
  // IFuture requirements
  playerPieceType: PieceType;
  preMoveAssessment: Assessment;
  score: any;
  notes: string;
  trace: boolean;

  player: Player;
  opponent: Player;

  move: Move | null;
  projectedOpponentMove: Move | null;
  projectedOpponentFutureDebugString: string;
  nextFuture: Future | null;

  postMoveAssessment: Assessment | null;
  postOpponentMoveAssessment: Assessment | null;
  postMoveDisposition: Disposition | null;
  movesAhead: number;

  constructor(player: Player, opponent: Player, preMoveAssessment: Assessment) {
    this.playerPieceType = player.pieceType;
    this.score = 0;
    this.notes = '';
    this.trace = false;

    this.player = player;
    this.opponent = opponent;

    this.move = null;
    this.projectedOpponentMove = null;
    this.projectedOpponentFutureDebugString = '';
    this.nextFuture = null;

    this.preMoveAssessment = preMoveAssessment;
    this.postMoveAssessment = null;
    this.postOpponentMoveAssessment = null;
    this.postMoveDisposition = null;
    this.movesAhead = -1;
  }

  calculateMoveDisposition(board: Board) {
    sr.assert(!!this.preMoveAssessment);
    sr.assert(!!this.postMoveAssessment);
    sr.assert(!this.postMoveDisposition);
    if (!this.preMoveAssessment || !this.postMoveAssessment) throw 'logic error'

    this.postMoveDisposition = this.calculateDisposition(this.preMoveAssessment, this.postMoveAssessment);

    if (!this._won()){
      this.postMoveDisposition.noOpponentMoves = this.opponent.hasMoves(board) === false;
      if (this.postMoveDisposition.noOpponentMoves){
        this.postMoveAssessment.notes += this.postMoveDisposition.toString();
      }
    }
  }

  calculateDispositionChain(): Array<Disposition> {
    let result: Array<Disposition> = [ ];
    this.forEachAssessmentAndDisposition( (preMoveAssessment, postMoveAssessment, disposition) => result.push(disposition) );
    return result;
  }


  /**
   * Iterate over pre- and post- move assessment pairs referenced by 'this' and
   * all Futures in the chain, calculating disposition
   *
   */
  forEachAssessmentAndDisposition(v: IAssessmentAndDispositionVisitor){
    this.forEachAssessmentPair( (preMoveAssessment, postMoveAssessment) => {
      const d = this.calculateDisposition(preMoveAssessment, postMoveAssessment)
      v(preMoveAssessment, postMoveAssessment, d);
    })
  }

  /**
   * Iterate over pre- and post- move assessment pairs referenced by 'this' and
   * all Futures in the chain.
   *
   */
  forEachAssessmentPair(v: IPreAndPostAssessmentVisitor){
    for (let f:Future | null = this; !!f; f = f.nextFuture){
      if (!f.postMoveAssessment) throw 'logic error';
      v(f.preMoveAssessment, f.postMoveAssessment);
      if (f.postOpponentMoveAssessment){
        v(f.postMoveAssessment, f.postOpponentMoveAssessment);
      }
    }
  }

  _won(): boolean {
    if (!this.postMoveAssessment) throw 'logic error';
    const postMoveOpponentStats = this.postMoveAssessment.opponentCount(this.player.pieceType);
    if (postMoveOpponentStats.pieces === 0) return true;
    if (this.postMoveDisposition){
      if (this.postMoveDisposition.noOpponentMoves){
        return true
      }
    }
    return false;
  }

  toString(): string {
    let result = this.player.toString() + ' ';
    if (this.move){
      result += this.move.toString() +  ' ';
    } else {
      result += ' no best move ';
    }
    return result;
  }

  calculateDisposition(a: Assessment, b: Assessment): Disposition {
    return Assessment.calculateDisposition(this.player.pieceType, a, b);
  }

  evaluateMove(board: Board, evaluator: Evaluator, task: MultiStepTask, move: Move, movesAhead: number): Promise<Future> {
    this.move = move;
    if (movesAhead >= maxMovesAhead){
      return Promise.reject(`already evaluated max number of moves, ${movesAhead}`);
    }

    board.executeMove(move);
    movesAhead++;

    const boardHash = board.getHash();
    sr.assert(boardHash !== '');
    sr.assert(this.postMoveAssessment === null);
    this.postMoveAssessment = this.player.assessBoardAfterMove(board);

    this.calculateMoveDisposition(board);
    sr.assert(!!this.postMoveDisposition);

    task.stepCompleted(); // finished evaluating 'move', itself

    if (this._won() || movesAhead === maxMovesAhead) {
      task.reportComplete();
      return Promise.resolve(this);
    }

    const opponentPreMoveAssessment = this.postMoveAssessment;
    let opponentTask = new RecursiveTask(task);
    opponentTask.id = task.stepsCompleted; //+++ super hacky

    let opponentEvaluator = new Evaluator(opponentTask, this.opponent.strategy);
    opponentEvaluator.log = movesAhead === 1;

    if (DEBUG && movesAhead === 1){
      let a = this.opponent.assessBoard(board);
      sr.assert(a.isEqual(opponentPreMoveAssessment));
    }

    sr.assert(movesAhead < maxMovesAhead);
    return opponentEvaluator.evaluatePossibleMoves(board, opponentTask, this.opponent, this.player, opponentPreMoveAssessment, movesAhead)
      .then( opponentsFuture => {
        sr.assert(!!opponentsFuture.postMoveDisposition);
        sr.assert(!!opponentsFuture.postMoveAssessment);
        sr.assert(opponentsFuture.movesAhead === movesAhead);

        //+++ Here we're assuming the opponent always picks the best move.
        // It might be worthwhile to evaluate other possible opponent moves.
        this.postOpponentMoveAssessment = opponentsFuture.postMoveAssessment;
        let opponentsMove = opponentsFuture.move;
        this.projectedOpponentMove = opponentsMove;
        if (DEBUG && evaluator.log) {
          this.projectedOpponentFutureDebugString = opponentEvaluator.futureDebugString(opponentsFuture);
        }
        sr.assert(opponentsMove !== null);
        if (!opponentsMove) throw 'logic error';

        if (DEBUG){
          const newBoardHash = board.getHash();
          sr.assert(boardHash === newBoardHash, 'someone changed our board');
        }

        board.executeMove(opponentsMove);
        movesAhead++;

        task.stepCompleted(); // finished evaluating opponent's move

        if (movesAhead >= maxMovesAhead || opponentsFuture._won()){
          task.reportComplete();
          return Promise.resolve(this);
        }

        sr.assert(movesAhead < maxMovesAhead);
        return evaluator.getBestFuture(task, board, this.player, this.opponent, movesAhead)
          .then(future => {
            sr.assert(!!future);
            this.nextFuture = future;
            task.reportComplete();//+++ this shouldn't be necessary
            return Promise.resolve(this); //+++ Can't we just return 'this'?
          });

      })

  }

}

