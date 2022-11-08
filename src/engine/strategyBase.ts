import {Board, PieceType} from "./checkersBase";
import * as sr from "./sr";


/**
 * A callback that takes a pre-move assessment, post-move assessment,
 * and the Disposition (change) from pre to post.
 *
 */
export interface IAssessmentAndDispositionVisitor {
    (pre: Assessment, post: Assessment, d: Disposition) : void;
}

/**
 * A callback that takes a pre-move assessment and a post-move assessment
 *
 */
export interface IPreAndPostAssessmentVisitor {
    (pre: Assessment, post: Assessment) : void;
}


export interface IFuture {
    playerPieceType: PieceType;
    preMoveAssessment: Assessment;
    score: any;
    notes: string;
    trace: boolean;
    forEachAssessmentAndDisposition: (v: IAssessmentAndDispositionVisitor) => void;
    forEachAssessmentPair: (v: IPreAndPostAssessmentVisitor) => void;
    calculateDisposition: (a: Assessment, b: Assessment) => Disposition;

}

export interface IStrategy {
    assessBoard: (board: Board, nextMovePieceType: PieceType) => Assessment;
    pickBestFuture: (futures: Array<IFuture>) => IFuture;
    scoreFutures: (futures: Array<IFuture>) => void;
}

export class BoardStats {
    pieces: number;
    kings: number;
    piecesOnHomeRow: number;
    penetration: number; /** how deep into opponent territory non-kings are */
    frozenPieces: number; /** count of pieces with no moves at all */
    pinnedDownPieces: number; /** count of pieces whose only move(s) lead to immediate capture */
    piecesWithAccessToKingRow: number;

    /** A piece needs to be 'maxMovesAhead/2' moves or less from the king row,
        for the the 'kings' component to have any effect. 'proximityToKingSquare' is meant to
        provide incentive for pieces to get closer to an empty, or friendly-occupied king
        square. Values range from 0 to 1, with 1 meaning non-kings are close to a king square
        and 0 meaning they're far. */
    proximityToKingSquare: number;
    userField0: number;

    constructor() {
        this.pieces = 0;
        this.kings = 0;
        this.piecesOnHomeRow = 0;
        this.penetration = 0;
        this.frozenPieces = 0;
        this.pinnedDownPieces = 0;
        this.piecesWithAccessToKingRow = 0;
        this.proximityToKingSquare = 0;
        this.userField0 = 0;
    }
    lost(): boolean{
        return this.pieces === this.frozenPieces;
    }
    isEqual(other: BoardStats): boolean {
        return sr.objectsAreEqual(this, other);
    }
    nonKings(): number {
        return this.pieces - this.kings;
    }
    penetrationRatio():number {
        return this.nonKings() > 0 ? (this.penetration / this.nonKings()) : 0;
    }
    piecesWithAccessToKingRowRatio(): number {
        return this.nonKings() > 0 ? (this.piecesWithAccessToKingRow / this.nonKings()) : 0;
    }
    pinnedDownPiecesRatio(): number {
        return this.pieces > 0 ? this.pinnedDownPieces / this.pieces : 0;
    }
}

export class Assessment {
    blackStats: BoardStats;
    redStats: BoardStats;
    nextMove: PieceType;
    possibleMoves: number;
    possibleMovesAreJumps: boolean;
    notes: string;

    constructor(board: Board, nextMove: PieceType) {
        this.blackStats = Assessment.getStats(board, PieceType.BLACK);
        this.redStats = Assessment.getStats(board, PieceType.RED);
        this.nextMove = nextMove;
        this.possibleMoves = 0;
        this.possibleMovesAreJumps = false;
        this.notes = '';
    }

    myCount(pieceType: PieceType): BoardStats {
        return (pieceType === PieceType.BLACK) ? this.blackStats : this.redStats;
    }

    opponentCount(pieceType: PieceType): BoardStats {
        return (pieceType === PieceType.BLACK) ? this.redStats : this.blackStats;
    }

    isEqual(other: Assessment): boolean {
        return this.blackStats.isEqual(other.blackStats) &&
            this.redStats.isEqual(other.redStats);
        // ignore this.notes
    }

    static getStats(board: Board, pieceType: PieceType){
        let ss = new BoardStats();
        const kingSquares = board.getPotentialKingSquares(pieceType);
        const pieces = board.getPieces(pieceType);
        for (let piece of pieces){
            sr.assert(!!piece);
            if (piece){
                ss.pieces++;
                if (piece.isKing()){
                    ss.kings++;
                } else {
                    if (kingSquares.length) {
                        let d = piece.shortestDistanceTo(board, kingSquares);
                        if (d !== undefined) {
                            ss.piecesWithAccessToKingRow++;
                            // Bigger numbers are better, so invert 'd'.
                            // Also, clamp 'd' to 0 - 5, provide incentive to get close
                            // enough to a king square for the 'kings' component to have an effect.
                            ss.proximityToKingSquare += (5 - Math.min(5, d)) / 5;
                        }
                    }
                }
                const d = piece.distanceFromHomeRow(board)
                if (d === 0){
                    ss.piecesOnHomeRow++;
                }

                ss.penetration += d / 7;
            }
        }

        if (ss.pieces > 0) {
            ss.frozenPieces = board.getPieceTypeFrozenPieces(pieceType);
            ss.pinnedDownPieces = board.getPinnedDownPiecesOfType(pieceType);
            if (ss.piecesWithAccessToKingRow) {
                ss.proximityToKingSquare /= ss.piecesWithAccessToKingRow;
            }
        }

        return ss;
    }

    /**
     * A Disposition depends on the point of view of a particular player.
     */
    static calculateDisposition(pieceType: PieceType, preMoveAssessment: Assessment, postMoveAssessment: Assessment): Disposition {
        const myPreMoveCount = preMoveAssessment.myCount(pieceType);
        const opponentPreMoveCount = preMoveAssessment.opponentCount(pieceType);
        const myPostMoveCount = postMoveAssessment.myCount(pieceType);
        const opponentPostMoveCount = postMoveAssessment.opponentCount(pieceType);

        let d = new Disposition();
        d.piecesLost        = myPreMoveCount.pieces       - myPostMoveCount.pieces;
        d.piecesCaptured    = opponentPreMoveCount.pieces - opponentPostMoveCount.pieces;
        d.kingsMade         = myPostMoveCount.kings       - myPreMoveCount.kings;
        d.opponentKingsMade = opponentPostMoveCount.kings - opponentPreMoveCount.kings;
        return d;
    }
}

export class Disposition {
    piecesLost: number;
    piecesCaptured: number; // AKA opponentPiecesLost
    kingsMade: number; // can be positive or negative
    opponentKingsMade: number;
    noMoves: boolean;
    noOpponentMoves: boolean;

    constructor() {
        //+++ Break this up? Create two Dispositions, each w/ half the data? Similar to how Assessment works?
        this.piecesLost = 0;
        this.piecesCaptured = 0; // AKA opponentPiecesLost

        this.kingsMade = 0; // can be positive or negative
        this.opponentKingsMade = 0;

        this.noMoves = false;
        this.noOpponentMoves = false;
    }

    hasChange(): boolean {
        return this.piecesLost !== 0 || this.piecesCaptured !== 0 || this.kingsMade !== 0 || this.opponentKingsMade !== 0;
    }

    toString(): string {
        let s = '';

        if (this.piecesCaptured){
            s += `cap'd ${this.piecesCaptured} `;
            if (this.opponentKingsMade < 0){
                s += `(${ -1 * this.opponentKingsMade}K) `;
            }
        }
        if (this.piecesLost){
            s += 'lost ' + this.piecesLost + ' ';
            if (this.kingsMade < 0) {
                s += `(${ -1 * this.kingsMade}K) `;
            }
        }

        if (this.kingsMade > 0){
            s += 'kinged ' + this.kingsMade + ' ';
        }
        if (this.opponentKingsMade > 0){
            s += 'oppoKings:' + this.opponentKingsMade + ' ';
        }
        if (this.noMoves){
            s += 'NO MOVES ';
        }
        if (this.noOpponentMoves){
            s += 'NO OPPONENT MOVES ';
        }
        if (s === '') { s = 'no change'}
        return s;
    }
}

