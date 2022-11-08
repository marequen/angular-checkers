import * as sr from "./sr";
import {Board, opponentPieceType, Piece, PieceType} from "./checkersBase";
import {Assessment, Disposition, BoardStats, IFuture, IStrategy} from "./strategyBase";


const DEBUG = true;

function calcMaxPenetration(n: number){
  let piecesOnRow7 = Math.min(n, 4);
  let piecesOnRow6 = Math.max(0, Math.min(n - 4, 4));
  let piecesOnRow5 = Math.max(0, Math.min(n - 8, 4));
  return piecesOnRow7 + (piecesOnRow6 * (6/7)) + (piecesOnRow5 * (5/7));
}

// Maximum penetration is 12 pieces filling the 3 rows furthest from home,
// yet not on the 'king' row
const MAX_PENETRATION = calcMaxPenetration(12);

function Strategy001_scoreFuture(f: IFuture): [number, number] {

    const _scoreDisposition = function (d: Disposition): number {
      const pieceComponent = d.piecesCaptured - d.piecesLost;
      const kingComponent = d.kingsMade - d.opponentKingsMade;
      let score = pieceComponent + (kingComponent * 0.9);
      sr.assert(Number.isNaN(score) === false);
      return score;
    }

    let result: [number, number] | undefined = undefined;
    let i = 0;
    let lastWithChange = 0
    let lastAssessmentWithDispositionChange: Assessment | undefined = undefined;
    const pieceType = f.playerPieceType;
    f.forEachAssessmentAndDisposition((pre, post, d) => {
      if (result === undefined) { // If decided the result in a previous iteration, do nothing.
        if (post.opponentCount(pieceType).pieces === 0 || d.noOpponentMoves) {
          // winning move
          result = [1000, i];
        }
        if (post.myCount(pieceType).pieces === 0 || d.noMoves){
          // losing move
          result = [-1000, i];
        }
        if (lastAssessmentWithDispositionChange === undefined || d.hasChange()) {
          lastWithChange = i;
          lastAssessmentWithDispositionChange = post;
        }

        i++;
      }
    });

    if (result) return result;

    if (lastAssessmentWithDispositionChange === undefined) throw 'logic error';

    const cumDisposition = f.calculateDisposition(f.preMoveAssessment, lastAssessmentWithDispositionChange);
    const score = _scoreDisposition(cumDisposition);
    return [score, lastWithChange];
}

function Strategy001_pickBestFuture(futures: Array<IFuture>) : IFuture {

  if (futures.length === 0) throw 'logic error';

  let bestScore: number;
  let bestScoreOffset = Number.MAX_VALUE;
  let bestFutures: Array<IFuture> = [];

  futures.forEach(future => {
    let [score, scoreOffset] = Strategy001_scoreFuture(future);
    //scores.push(score);
    future.score = score; // for toString
    sr.assert(!Number.isNaN(score));
    if (bestScore === undefined || (score === bestScore && scoreOffset <= bestScoreOffset)){
      bestScore = score;
      bestScoreOffset = scoreOffset;
      bestFutures.push(future);
    } else if (score > bestScore ||
      (score === bestScore && scoreOffset < bestScoreOffset)){
      bestScore = score;
      bestScoreOffset = scoreOffset;
      bestFutures = [future];
    }
  })

  //+++ TODO: don't pick randomly
  return sr.arrayPickRandom(bestFutures);
}

function Strategy001_scoreFutures(futures: Array<IFuture>) {
  scoreFutures(futures, Strategy001_scoreFuture);
}

function pickBestFutures(futures: Array<IFuture>, fn: Function): Array<IFuture> {
  let bestFutures: Array<IFuture> = [];

  futures.forEach(future => {
    let score = fn(future);
    future.score = score; // for toString
    sr.assert(!Number.isNaN(score));
    if (bestFutures.length === 0 || score > bestFutures[0].score){
      bestFutures = [future];
    } else if (score === bestFutures[0].score){
      bestFutures.push(future);
    }

  });

  return bestFutures;
}

function pickBestFuture(futures: Array<IFuture>, fn: Function): IFuture {
  return pickBestFutures(futures, fn)[0];
}

function scoreFutures(futures: Array<IFuture>, fn: Function) {
  futures.forEach(future => {
    let score = fn(future);
    future.score = score; // for toString
    sr.assert(!Number.isNaN(score));
  });
}

function Strategy002_scoreFuture(f: IFuture): number {
    let lastAssessment: Assessment | undefined;
    f.forEachAssessmentPair( (_pre, post) => { lastAssessment = post });
    if (lastAssessment == undefined) throw 'logic error';
    const d = f.calculateDisposition(f.preMoveAssessment, lastAssessment);

    const pieceType = f.playerPieceType;
    const myLastMoveCount = lastAssessment.myCount(pieceType);
    const opponentLastMoveCount = lastAssessment.opponentCount(pieceType);

    const pieceComponent = d.piecesCaptured - d.piecesLost;
    const kingComponent = d.kingsMade - d.opponentKingsMade;
    const homeRowComponent = myLastMoveCount.piecesOnHomeRow - opponentLastMoveCount.piecesOnHomeRow;
    const penetrationComponent = myLastMoveCount.penetration - opponentLastMoveCount.penetration;

    let score = pieceComponent +
      (kingComponent * 0.9) +
      (homeRowComponent * 0.25) +
      (penetrationComponent / MAX_PENETRATION);
    sr.assert(Number.isNaN(score) === false);

    f.notes = `components: piece=${pieceComponent} king=${kingComponent * 0.9} homeRow=${homeRowComponent * 0.25} penetration:${penetrationComponent / MAX_PENETRATION}`;

    return score;
  }

function Strategy002_pickBestFuture(futures: Array<IFuture>): IFuture {
  return pickBestFuture(futures, Strategy002_scoreFuture);
}
function Strategy002_scoreFutures(futures: Array<IFuture>) {
  scoreFutures(futures, Strategy002_scoreFuture);
}

//++ This has significant overlap with BoardStats. Something seems no right, design-wise
class ScoreComponents  {
  piece: number;
  king: number;
  homeRow: number;
  penetration: number;
  won: boolean;
  lost: boolean;
  frozenPieces: number;
  distanceToTarget: number;
  proximityToKingSquare: number;
  pinnedDownPieces: number;
  piecesWithAccessToKingRow: number;
  debugNotes: string;
  certainty: number;

  constructor(piece: number, king: number, homeRow: number, penetration: number) {
    this.piece = piece;
    this.king = king;
    this.homeRow = homeRow;
    this.penetration = penetration;
    this.won = false;
    this.lost = false;
    this.frozenPieces = 0;
    this.distanceToTarget = 0;
    this.proximityToKingSquare = 0;
    this.pinnedDownPieces = 0;
    this.piecesWithAccessToKingRow = 0;
    this.debugNotes = '';
    this.certainty = 1;
  }

  add(other: ScoreComponents): any {
    sr.objectsAdd(this, other);
    return this;
  }

  subtract(other: ScoreComponents): any {
    sr.objectsSubtract(this, other);
    return this;
  }

  multiply(x: number){
    sr.objectMultiply(this, x);
    return this;
  }

  isEqual(other: ScoreComponents){
    return sr.objectsAreEqual(this, other);
  }
}

function _calcKingWeight(pieceType: PieceType, preMoveAssessment: Assessment): number {
  // Later in the game, it's important to get kings. We must value getting
  // kings slightly higher than giving kings or an imminent opponent king
  // move would cancel out the value of our own.
  const myPreMoveCount        = preMoveAssessment.myCount(pieceType)
  const opponentPreMoveCount  = preMoveAssessment.opponentCount(pieceType);
  const pieceRatio = myPreMoveCount.pieces / opponentPreMoveCount.pieces;
  const myKingWeight = 1 / pieceRatio;
  return myKingWeight;
}

//+++ home row weighting needs work
function _calcHomeRowComponentWeight(myCount: BoardStats, opponentCount: BoardStats): number {
  if (myCount.piecesOnHomeRow === 4){
    return 1;
  }
  if (opponentCount.pieces === opponentCount.kings){
    return 0;
  }

  const opponentNonKings = opponentCount.pieces - opponentCount.kings;
  return opponentNonKings / opponentCount.pieces;
}

function _scoreDelta(pieceType: PieceType, preMoveAssessment: Assessment, postMoveAssessment: Assessment, d: Disposition, myKingWeight: number): ScoreComponents {
  const myPostMoveCount       = postMoveAssessment.myCount(pieceType);
  const opponentPostMoveCount = postMoveAssessment.opponentCount(pieceType);

  const pieceComponent = d.piecesCaptured - d.piecesLost;

  let kingComponent = (d.kingsMade - d.opponentKingsMade) * myKingWeight;

  //+++ home row weighting needs work
  const myHomeRowComponentWeight = _calcHomeRowComponentWeight(myPostMoveCount, opponentPostMoveCount);
  const opponentHomeRowComponentWeight = _calcHomeRowComponentWeight(opponentPostMoveCount, myPostMoveCount);
  const homeRowComponent = (myPostMoveCount.piecesOnHomeRow * myHomeRowComponentWeight) -
    (opponentPostMoveCount.piecesOnHomeRow * opponentHomeRowComponentWeight);

  // When weighing our own penetration against the opponent's, we should ignore opponent's penetration
  // score when there's nothing we can do about it. Otherwise, out P and opponent's P may cancel each
  // other out, preventing us from getting a king
  const penetrationComponent = myPostMoveCount.penetrationRatio()  -
    (opponentPostMoveCount.penetrationRatio() * 0.7);

  const pinnedDownPiecesComponent = opponentPostMoveCount.pinnedDownPiecesRatio() - myPostMoveCount.pinnedDownPiecesRatio();

  const piecesWithAccessToKingRowComponent = myPostMoveCount.piecesWithAccessToKingRowRatio() -
    opponentPostMoveCount.piecesWithAccessToKingRowRatio();

  let result = new ScoreComponents(pieceComponent, kingComponent, homeRowComponent, penetrationComponent);
  result.proximityToKingSquare = myPostMoveCount.proximityToKingSquare;
  result.pinnedDownPieces = pinnedDownPiecesComponent;
  result.piecesWithAccessToKingRow = piecesWithAccessToKingRowComponent;
  result.won  = opponentPostMoveCount.lost() ? true : false;
  result.lost = myPostMoveCount.lost() ? true : false;
  sr.assert(!(result.won && result.lost), 'logic error');
  return result;
}


function Strategy003_scoreFuture(f: IFuture): number {
    let lastAssessment: Assessment | undefined;
    f.forEachAssessmentPair( (_pre, post) => { lastAssessment = post });
    if (lastAssessment == undefined) throw 'logic error';

  const d = f.calculateDisposition(f.preMoveAssessment, lastAssessment);
    const pieceType = f.playerPieceType;

    const myKingWeight = _calcKingWeight(pieceType, f.preMoveAssessment);

    let sc = _scoreDelta(pieceType, f.preMoveAssessment, lastAssessment, d, myKingWeight);

    sc.king *= 1.5;
    sc.penetration /= MAX_PENETRATION;
    sc.homeRow *= 0.2;

    let score = sc.piece + sc.king + sc.penetration + sc.homeRow;
    f.notes = 'components:' + JSON.stringify(sc);
    return score;
}

function Strategy003_pickBestFuture(futures: Array<IFuture>) {
  return pickBestFuture(futures, Strategy003_scoreFuture);
}
function Strategy003_scoreFutures(futures: Array<IFuture>) {
  scoreFutures(futures, Strategy003_scoreFuture);
}

/**
 * Whereas Strategy003 looks at the difference between the first pre-move assessment, and the final
 * post-opponent-move assessment to come up with a score. THIS strategy attempts to look at every
 * move in the chain, and attempting to weight each assessment by its likelihood. One way this SHOULD
 * be an improvement over Strategy003, is that good results that are more likely to occur aren't ignored
 * because a different move results in equally good (or marginally better) results that are futurer in
 * the future, and not certain to occur.
 */
class Strategy004 implements IStrategy {
  assessBoard(board: Board, nextMove: PieceType):Assessment {
    return new Assessment(board, nextMove);
  }
  pickBestFuture(futures: Array<IFuture>): IFuture {
    this.scoreFutures(futures);
    let result = sr.arrayFindBest(futures, f => f.score, (a, b) => b > a);
    if (result === undefined) throw 'logic error';
    return result;
  }
  scoreFutures(futures: Array<IFuture>) {
    let prox2KingSqWeight = 0.66;
    futures.forEach( f => {
      let sc = this._calcScoreComponents(f);
      let s = this._score(sc, prox2KingSqWeight);
      f.score = s;
      sr.assert(!Number.isNaN(s));
      f.notes = `score: ${s} ` + JSON.stringify(sc);
    })
  }

  private _calcScoreComponents(f: IFuture): ScoreComponents {
    const myKingWeight = _calcKingWeight(f.playerPieceType, f.preMoveAssessment);

    let cumScore: ScoreComponents | undefined = undefined;
    let certainty = 1.0, i = 0;
    f.forEachAssessmentAndDisposition((preMoveAssessment, postMoveAssessment, disposition) => {
      let score = _scoreDelta(f.playerPieceType, preMoveAssessment, postMoveAssessment, disposition, myKingWeight);
      if ((i % 2) === 1 && preMoveAssessment.possibleMoves > 1 && preMoveAssessment.possibleMovesAreJumps === false) {
        // Now we're in the realm of stuff that MIGHT happen.
        // If the opponent doesn't pick the move we predict for it,
        // 'score' is invalid.
        const thisStepProbability = 1 / preMoveAssessment.possibleMoves;
        certainty *= thisStepProbability;
        if (DEBUG && Number.isFinite(certainty) === false) throw 'error calculating certainty';
      }
      i++;
      // scoreComponents.certainty = certainty;
      if (cumScore === undefined) {
        cumScore = score;
      } else {
        cumScore.add(score.multiply(certainty));
      }
    });
    if (cumScore === undefined) {
      throw 'logic error';
    } else {
      let definedCumScore: ScoreComponents = cumScore;
      //f.notes = `certainty: ${certainty}`;
      const piece = definedCumScore.piece;
      const king = definedCumScore.king;
      definedCumScore.multiply(1 / i);
      definedCumScore.piece = piece;
      definedCumScore.king = king;
      return definedCumScore;
    }
  }

  protected _score(sc: ScoreComponents, prox2KingSqWeight: number): number {
    if (sc.won) return 1000;
    if (sc.lost) return -1000;
    let score = sc.piece +
        sc.king * 1.5 +
        sc.penetration / MAX_PENETRATION +
        sc.homeRow * 0.2 +
       (sc.pinnedDownPieces * 0.1) +
        sc.piecesWithAccessToKingRow +
        sc.proximityToKingSquare * prox2KingSqWeight;
    sr.assert(!Number.isNaN(score));
    return score;
  }
}

class SimpleStrategyWrapper implements IStrategy {
  scoreAllCallback: Function;
  pickBestCallback: Function;
  constructor(pickBestCallback: Function, scoreAllCallback: Function) {
    this.scoreAllCallback = scoreAllCallback;
    this.pickBestCallback = pickBestCallback;
  }
  assessBoard(board: Board, nextMove: PieceType):Assessment {
    return new Assessment(board, nextMove);
  }
  pickBestFuture(futures: Array<IFuture>): IFuture {
    return this.pickBestCallback(futures);
  }
  scoreFutures(futures: Array<IFuture>) {
    return this.scoreAllCallback(futures);
  }
}

class ScoreComponents2 extends ScoreComponents {
  piecesLost: number;
  kingsMade: number;
  constructor(piece: number, king: number, homeRow: number, penetration: number) {
    super(piece, king, homeRow, penetration);
    this.piecesLost = 0;
    this.kingsMade = 0;
  }
}

/** This strategy tries to have a better end-game, by including logic
 * to seek and destroy enemies (needed if they are more than maxMoves away).
 */
class Strategy005 extends Strategy004 {
  seekAndDestroy: boolean | undefined;

  constructor() {
    super();
    this.seekAndDestroy = undefined;
  }

  override assessBoard(board: Board, nextMove: PieceType): Assessment {
    let assessment = new Assessment(board, nextMove);
    if (this.seekAndDestroy === undefined) {
      this.seekAndDestroy = Strategy005._shouldSeekAndDestroy(PieceType.RED, assessment) ||
          Strategy005._shouldSeekAndDestroy(PieceType.BLACK, assessment);
    }
    if (this.seekAndDestroy){
      Strategy005._augmentBoardStatsForSeekAndDestroy(board, assessment.redStats, PieceType.RED);
      Strategy005._augmentBoardStatsForSeekAndDestroy(board, assessment.blackStats, PieceType.BLACK);
    }
    return assessment;
  }

  override pickBestFuture(futures: Array<IFuture>): IFuture {
    this.scoreFutures(futures);
    let result = sr.arrayFindBest(futures, f => f.score, (a, b) => b > a);
    if (result === undefined) throw 'logic error';
    return result;
  }

  override scoreFutures(futures: Array<IFuture>) {
    if (!this.seekAndDestroy) return super.scoreFutures(futures);
    
    let prox2KingSqWeight = 0.66;
    futures.forEach( f => {

      let sc = this._scoreFuture5(f);
      let s = this._score5(sc, prox2KingSqWeight);
      f.score = s;
      f.notes = `score: ${s} ` + JSON.stringify(sc);
    });
  }

  private _score5(sc: ScoreComponents, prox2KingSqWeight: number): number {
    let s = super._score(sc, prox2KingSqWeight);
    if (!sc.won && !sc.lost) {
      s += sc.distanceToTarget;
    }
    sr.assert(!Number.isNaN(s));
    return s;
  }

  private static _companionship(board: Board, piece: Piece): number {
    let companionship = 0;
    const maxDistance = 3;
    const maxCompanionship = 4 * maxDistance;
    for (let distance = 1; distance <= maxDistance; distance++){
      for (let xDelta = -1 * distance; xDelta <= distance; xDelta++){
        for (let yDelta = -1 * distance; yDelta <= distance; yDelta++){
          if (xDelta === 0 && yDelta === 0) {
            // skip out own square
          } else {
            const row = piece.square.loc.row + xDelta;
            const col = piece.square.loc.col + yDelta;
            if (Board.isValidRowAndColumn(row, col)){
              const w = board.whatsAtRowColumn(row, col);
              if (w.hasPiece() && w.pieceType() === piece.pieceType){
                // a friend
                companionship += 1 / distance;
              }
            }
          }
        }
      }
    }
    
    return (companionship / maxCompanionship);
  }
  
  private static _isolation(board: Board, piece: Piece): number {
    return 1 - this._companionship(board, piece);
  }
  private static _avgProximity(target: Piece, seekers: Array<Piece>): number {
    let cumP = 0;
    for (let seeker of seekers){
      let d = seeker.movesTo(target); // d should be 1 (close) to 7 (far)
      if (d === undefined) throw 'logic error';

      // Invert 'd' (distance) to get proximity: 7 (close) to 1 (far).
      // When scoring a move, it's easier to have larger values be better.
      let p = 7 - d;

      // Normalize 'p' to 0...1
      p = p / 7;
      cumP += p;
    }
    return cumP / seekers.length;
  }

  private static _getMostIsolatedOpponentKing(board: Board, pieceType: PieceType, seekers: Array<Piece>) : Piece {
    const pieces = board.getPieces(opponentPieceType[pieceType]);
    let result = sr.arrayFindBest(pieces, piece => piece.isKing() ? this._isolation(board, piece) * this._avgProximity(piece, seekers): 0, (a,b) => b > a);
    if (result === undefined) throw 'logic error';
    return result;
  }
  private static _getMostIsolatedOpponentPiece(board: Board, pieceType: PieceType, seekers: Array<Piece>) : Piece {
    const pieces = board.getPieces(opponentPieceType[pieceType]);
    let result = sr.arrayFindBest(pieces, piece => this._isolation(board, piece) * this._avgProximity(piece, seekers), (a,b) => b > a);
    if (result === undefined) throw 'logic error';
    return result;
  }
  private static _getSeekAndDestroyTarget(board: Board, pieceType: PieceType, seekers: Array<Piece>): Piece {
    let target = this._getMostIsolatedOpponentKing(board, pieceType, seekers);
    if (target === undefined){
      target = this._getMostIsolatedOpponentPiece(board, pieceType, seekers);
    }
    return target;
  }
  private static _augmentBoardStatsForSeekAndDestroy(board: Board, stats: BoardStats, pieceType: PieceType){
    const kings = board.getKings(pieceType);
    let target = this._getSeekAndDestroyTarget(board, pieceType, kings);
    if (!!target){
      let cumProximityToTarget = [];
      let maxP = 0;
      let cumP = 0;
      for (let king of kings){
        let d = king.movesTo(target); // d should be 1 (close) to 7 (far)
        if (d === undefined) throw 'logic error';

        // Invert 'd' (distance) to get proximity: 7 (close) to 1 (far).
        // When scoring a move, it's easier to have larger values be better.
        let p = 7 - d;
        // Normalize 'p' to 0...1
        p = p / 7;

        maxP = Math.max(maxP, p);
        cumP += p;
        cumProximityToTarget.push(p);
      }

      if (kings.length){
        // In order to incentivize kings to move toward the target together,
        // we subtract the average delta-from-max-proximity from the
        // average proximity.
        let d2max = 0;
        for (let z of cumProximityToTarget){
          d2max += maxP - z;
        }
        let avgP = cumP / kings.length;
        let avgD2Max = d2max / kings.length;

        stats.userField0 = avgP - (avgD2Max / 2);
      }
    }
  }

  private static _shouldSeekAndDestroy(pieceType: PieceType, preMoveAssessment: Assessment): boolean {
    const myPreMoveCount        = preMoveAssessment.myCount(pieceType)
    const opponentPreMoveCount  = preMoveAssessment.opponentCount(pieceType);
    if (myPreMoveCount.nonKings() === 0) return true;
    if (myPreMoveCount.kings > opponentPreMoveCount.kings) return true;
    // const myNonKings = myPreMoveCount.pieces - myPreMoveCount.kings;
    // if (myNonKings < 3){
    //   if (myPreMoveCount.kings > opponentPreMoveCount.kings + 1){
    //     if (myPreMoveCount.pieces > opponentPreMoveCount.pieces){
    //       return true;
    //     }
    //   }
    // }
    return false;
  }

  private static _calcPenetrationWeight(pieceType: PieceType, preMoveAssessment: Assessment){
    const myPreMoveCount        = preMoveAssessment.myCount(pieceType)
    const opponentPreMoveCount  = preMoveAssessment.opponentCount(pieceType);

    const myNonKings = myPreMoveCount.pieces - myPreMoveCount.kings;
    const myKingRatio = myPreMoveCount.kings / myPreMoveCount.pieces;
    const opponentKingRatio = opponentPreMoveCount.kings / opponentPreMoveCount.pieces;
    let weNeedKings = myNonKings > 0 && (
      opponentPreMoveCount.kings > myPreMoveCount.kings || (
          opponentKingRatio > .49 && opponentPreMoveCount.pieces >= myPreMoveCount.pieces)
        )
      ;

    const maxPenetration = calcMaxPenetration(myNonKings);
    let penetrationWeight = 1 / maxPenetration;
    if (weNeedKings){
      penetrationWeight *= 3;
    }
    return penetrationWeight;
  }


  private static _scoreDelta2(pieceType: PieceType, preMoveAssessment: Assessment, postMoveAssessment: Assessment,
                              d: Disposition): ScoreComponents {
    const myPostMoveCount       = postMoveAssessment.myCount(pieceType);

    let result = _scoreDelta(pieceType, preMoveAssessment, postMoveAssessment, d, 1);
    result.distanceToTarget = myPostMoveCount.userField0;
    return result;
  }

  private _scoreFuture5(f: IFuture): ScoreComponents {
    //const myKingWeight = _calcKingWeight(f.playerPieceType, f.preMoveAssessment);

    let cumScore: ScoreComponents | undefined = undefined;
    let certainty = 1.0, i = 0;
    let debugNotes = '';
    let initialDistanceToTarget = 0.0;
    f.forEachAssessmentAndDisposition( ( preMoveAssessment, postMoveAssessment,disposition) => {
      let score = Strategy005._scoreDelta2(f.playerPieceType, preMoveAssessment, postMoveAssessment, disposition);
      if ((i % 2) === 1 && preMoveAssessment.possibleMoves > 1 && preMoveAssessment.possibleMovesAreJumps === false){
        // Now we're in the realm of stuff that MIGHT happen.
        // If the opponent doesn't pick the move we predict for it,
        // 'score' is invalid.
        // Presumably, our opponent move prediction is better than random, so we compute
        // a probability with this formula, rather than just dividing 1 by nMoves
        const thisStepProbability = 1.0 - Math.min(preMoveAssessment.possibleMoves, 5)  * 0.10;
        certainty *= thisStepProbability;
        if (DEBUG && Number.isFinite(certainty) === false) throw 'error calculating certainty';
      }
      i++;
      // scoreComponents.certainty = certainty;
      if (cumScore === undefined){
        cumScore = score;
        initialDistanceToTarget = score.distanceToTarget;
        if (f.trace){
          debugNotes += `${i} d2t:${score.distanceToTarget}`
        }
      } else {
        if (f.trace){
          debugNotes += `${i} new d2t:${score.distanceToTarget} cert:${certainty}`
        }
        cumScore.add(score.multiply(certainty));
      }
    });
    //f.notes = `certainty: ${certainty}`;
    if (cumScore === undefined) throw 'logic error';
    let definedCumScore: ScoreComponents = cumScore;
    const piece = definedCumScore.piece;
    const king = definedCumScore.king;
    definedCumScore.multiply(1/i);
    definedCumScore.piece = piece;
    definedCumScore.king = king;
    definedCumScore.debugNotes = debugNotes;
    definedCumScore.distanceToTarget = initialDistanceToTarget;
    return definedCumScore;
  }

  /** Is 'b' better than 'a' */
  private  _isBetterScore(a: ScoreComponents, b: ScoreComponents): boolean {
    if (b.won > a.won) return true;
    if (b.won === a.won){
      if (b.lost < a.lost) return true;
      if (b.lost === a.lost){
        if (b.piece > a.piece) return true;
        if (a.piece === b.piece){
          if (b.king > a.king) return true;
          if (a.king === b.king){
            if (b.piecesWithAccessToKingRow > a.piecesWithAccessToKingRow) return true;
            if (b.piecesWithAccessToKingRow === a.piecesWithAccessToKingRow) {
              if (b.pinnedDownPieces > a.pinnedDownPieces) return true;
              if (b.pinnedDownPieces === a.pinnedDownPieces) {
                if (b.distanceToTarget < a.distanceToTarget) return true
                if (b.distanceToTarget === a.distanceToTarget) {
                  if (b.penetration > a.penetration) return true;
                  if (a.penetration === b.penetration) {
                    return b.proximityToKingSquare < a.proximityToKingSquare;
                  }
                }
              }
            }
          }
        }
      }
    }
    return false;
  }

}

export function strategyFactory(name: string): IStrategy {
  const strategies: sr.StringKeyedObject = {
    'default'     : (_:IStrategy) => new SimpleStrategyWrapper(Strategy001_pickBestFuture, Strategy001_scoreFutures),
    'Strategy001' : (_:IStrategy) => new SimpleStrategyWrapper(Strategy001_pickBestFuture, Strategy001_scoreFutures),
    'Strategy002' : (_:IStrategy) => new SimpleStrategyWrapper(Strategy002_pickBestFuture, Strategy002_scoreFutures),
    'Strategy003' : (_:IStrategy) => new SimpleStrategyWrapper(Strategy003_pickBestFuture, Strategy003_scoreFutures),
    'Strategy004' : (_:IStrategy) => new Strategy004(),
    'Strategy005' : (_:IStrategy) => new Strategy005()
  };
  let s: Function = strategies[(name || 'default')];
  if (!s){
    //+++ Should probably throw here
    console.warn('No strategy named ' + name);
    s = strategies['default'];
  }
  return s();
}
