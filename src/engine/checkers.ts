import * as sr from './sr';
import * as srCheckers from './checkersBase';
import {BoardLocation, PieceType, Player, Square} from "./checkersBase";
import {Animator} from "./animator";
import {Move, SingleJumpMove} from "./move"

const REPORT_TO_MOTHER_SHIP = false;

export type BoardAnimationCallback = (square: BoardLocation, pieceElement: HTMLElement, left: number, top: number) => Promise<void>;

export class Board extends srCheckers.Board {

  redrawSquareCallback: (square: BoardLocation) => void = noOp;
  animatePieceCallback: BoardAnimationCallback | null = null;

  static override create(data: Object): Board {
    let result = new Board();
    result.serializeIn(data);
    return result;
  }

  setTopPlayer(topPlayer: Player){
    this.blackMovesUp = topPlayer.pieceType === PieceType.RED;
  }

  initializePieces(){
     this.clear();

     const bottomColor = this.blackMovesUp ? PieceType.BLACK : PieceType.RED;
     const topColor = srCheckers.opponentPieceType[bottomColor];

     for (let i = 0; i < 12; i++){
       let aRow = Math.floor(i / 4);
       let aCol = ((i % 4) * 2) + ((aRow +1) % 2);

       super.setPieceAtRowAndColumn(aRow, aCol, srCheckers.Square.valueOf(topColor, false));

       let bRow = Math.floor(i / 4) + 5;
       let bCol = ((i % 4) * 2) + ((bRow +1) % 2);
       super.setPieceAtRowAndColumn(bRow, bCol, srCheckers.Square.valueOf(bottomColor, false));
     }
  }

  redrawSquare(row: number, col: number){
    this.redrawSquareCallback(new BoardLocation(row, col));
  }

  /** Functions used by editor.js -- maybe move these */
  editor_setPieceAtRowAndColumn(row: number, col: number, pieceType: PieceType, king = false){
    if (Board.isValidRowAndColumn(row, col)){
      super.setPieceAtRowAndColumn(row, col, srCheckers.Square.valueOf(pieceType, king));
      this.redrawSquare(row, col);
    } else {
      throw 'Invalid row and/or column'
    }
  }

  deletePieceAtRowAndColumn(row: number, col: number){
    super.clearPieceAtRowAndColumn(row, col);
    this.redrawSquare(row, col);
  }
  /** End of editor.js dependencies */

}

function noOp(){}

type BasicCallback = () => void;
type Command = () => void;

export var theBoard = new Board();

export enum GameState {
  GAME_NOT_STARTED    = 0,
  GAME_IN_PROGRESS,
  GAME_OVER_NO_PIECES,
  GAME_OVER_NO_MOVES,
  GAME_OVER_RESIGNED,
  GAME_OVER_DRAW
}

class GameData {
  startData: sr.StringKeyedObject;
  board: GameData | undefined;

  constructor(data: sr.StringKeyedObject) {
    this.startData = data;
  }

  static serializeGame(game: Game, previouslyLoadedGameData: GameData | null, asSnapshot: boolean): sr.StringKeyedObject {
    let state: sr.StringKeyedObject = {
      'version': '0.01',
      'player': game.player.serialize(),
      'opponent': game.opponent.serialize(),
    }
    if (asSnapshot){
      state['snapshot'] = true;
      state['board'] = theBoard.serialize();
      state['nextPlayerPieceType'] = game.getNextPlayerPieceType();
    } else {
      // If we originally loaded a game file, in order to save it,
      // we have to serialize its initial board state
      const initialBoardState = previouslyLoadedGameData && previouslyLoadedGameData['board'];
      if (initialBoardState){
        state['board'] = initialBoardState;
      }
      state['moves'] = GameData.serializeMoves(game.moves)
    }
    return state;
  }

  static serializeMoves(gameMoves: Array<Move>){
    let moves = [];
    for (let move of gameMoves){
      try {
        let serializedMove = move.serialize();
        moves.push(serializedMove);
      } catch (e){
        console.log('Error ' + e + ' saving move: ' + JSON.stringify(move));
        break;
      }
    }
    return moves;
  }
}

interface MoveResult {
  ok: boolean;
  reason: string;
  forcedJumpMoves: Array<SingleJumpMove>
}

export class Game extends EventTarget {
  player: Player;
  opponent: Player;
  moves: Array<Move> = [];

  boardInitializedCallback: BasicCallback;
  progressCallback: (progress: number) => void;
  gameFinishedCallback: (player: Player | null, state: GameState) => void;
  gamePausedChangeCallback: (paused: boolean) => void;
  showAlertCallback: (message: string) => void;

  busy: boolean;

  private _gameData: GameData | null;
  private _gameState: GameState;
  private _playbackMode: boolean;
  private _movesToPlayBack: Array<Move>;
  private _playbackIndex: number;

  private _aiVsAiMode: boolean;
  private _pause: boolean;
  private _nextPlayerPieceType: PieceType;
  private _commandQueue: Array<Command> = []; // commands to be executed after any pending worker requests or animations
  private _debugPiece: BoardLocation | null;
  private _saveObjectUrlString: string;
  private _projectedNextMove: Move | undefined;
  private _worker: Worker | undefined;

  constructor() {
    super();
    this.boardInitializedCallback = noOp;
    this.progressCallback = noOp;
    this.gameFinishedCallback = noOp;
    this.gamePausedChangeCallback = noOp;
    this.showAlertCallback = (message: string) => window.alert(message);
    this.busy = false;
    this._gameData = null;
    this._gameState = GameState.GAME_NOT_STARTED;
    this._playbackMode = false;
    this._movesToPlayBack = [];
    this._playbackIndex = -1;

    this._aiVsAiMode = false;
    this._pause = false;
    this._nextPlayerPieceType = PieceType.BLACK;
    this._commandQueue = []; // commands to be executed after any pending worker requests or animations
    this._debugPiece = null;
    this._saveObjectUrlString = '';

    const playerPieceType = PieceType.BLACK;//sr.arrayPickRandom([srCheckers.PieceType.RED, srCheckers.PieceType.BLACK]);
    this.player = new Player(playerPieceType, 'Strategy004');
    this.opponent = new Player(srCheckers.opponentPieceType[playerPieceType], 'Strategy005');

    this._initializeMoves();
    this._initializePieces();
  }

  private _initializeMoves(){
    this.moves = [];
  }

  private _initializePieces(){
    // Always draw board with opponent on top, player on the bottom
    theBoard.setTopPlayer(this.opponent);
    theBoard.initializePieces();
  }

  getBoard(): Board {
    return theBoard;
  }

  setWorker(worker: Worker){
    sr.assert(this._worker === undefined, 'cannot set worker twice')
    this._worker = worker;
    worker.addEventListener('message', this._onWorkerMessage.bind(this));
    // @ts-ignore
    worker.addEventListener('error', this._onWorkerError.bind(this));
    // @ts-ignore
    worker.addEventListener('messageerror', this._onWorkerMessageError.bind(this));
  }

  paused(): boolean{
    return this._pause
  }

  finished(): boolean {
    return this._gameState === GameState.GAME_OVER_RESIGNED ||
        this._gameState === GameState.GAME_OVER_DRAW ||
        this._gameState === GameState.GAME_OVER_NO_MOVES ||
        this._gameState === GameState.GAME_OVER_NO_PIECES;
  }

  start(){
    this._gameState = GameState.GAME_IN_PROGRESS;
    this._playbackMode = false;
    this._setPaused(false);
    this.busy = false;
    this._initializeMoves();
    this._initializePieces();
    this.boardInitializedCallback();
    // Black always goes first
    if (this.opponent.pieceType === srCheckers.PieceType.BLACK){
      this._pickMove(this.opponent);
    } else if (this._aiVsAiMode) {
      this._pickMove(this.player);
    }
  }

  clear(){
    theBoard.clear();
    this.boardInitializedCallback();
  }
  debugMovesFor(square: Square){
    this._debugPiece = square.loc;
  }
  resign(){
    this.player.resigned = true;
    this._finish(this.player, GameState.GAME_OVER_RESIGNED);
  }

  suggestADraw(){
    this._suggestADraw(this.player);
  }

  restart(swap: boolean = true){
    // Swap player colors
    if (swap) {
      this.setPlayerColor(this.opponent.pieceType);
      this.player.resigned = false;
      this.opponent.resigned = false;
    }
    this.start();
  }

  setAiVsAi(aiVsAi: boolean){
    this._enqueueCommand( () => {
      this._aiVsAiMode = aiVsAi;
    });
  }
  getAiVsAi():boolean {
    return this._aiVsAiMode;
  }
  getPlaybackMode():boolean {
    return this._playbackMode;
  }

  setPlayerColor(pieceType: PieceType){
    this.player.pieceType = pieceType;
    this.opponent.pieceType = srCheckers.opponentPieceType[pieceType];
    theBoard.setTopPlayer(this.opponent);
  }
  setPlayerStrategy(strategy: string){
    this._enqueueCommand( () => {
      this.player.strategy = strategy
    });
  }
  setOpponentStrategy(strategy: string){
    this._enqueueCommand( () => {
      this.opponent.strategy = strategy
    });
  }

  setNextPlayerPieceType(pieceType: PieceType){
    this._nextPlayerPieceType = pieceType;
  }
  getNextPlayerPieceType(): PieceType {
    return this._nextPlayerPieceType;
  }

  _setPaused(p: boolean){
    if (this._pause !== p){
      this._pause = p;
      this.gamePausedChangeCallback(p);
    }
  }
  
  pause(){
    this._enqueueCommand( () => {
      this._setPaused(true)
    })
  }

  unpause(){
    this._enqueueCommand( () => {
      this._setPaused(false);
      if (this._playbackMode){
        this._playbackNextMove();
      } else {
        if (this._nextPlayerPieceType === this.player.pieceType) {
          if (this._aiVsAiMode) {
            this._pickMove(this.player);
          }
        } else {
          this._pickMove(this.opponent);
        }
      }
    })
  }

  // Currently, this is only used by the human player
  move(move: Move): MoveResult {
    let result: MoveResult = { ok: false, reason:'', forcedJumpMoves:[]};

    if (this.finished()) {
      result.reason = 'finished';
      return result;
    }
    if (this.busy) {
      this._showAlert('busy...');
      result.reason = 'busy';
      return result
    }

    if (!theBoard.isValidMove(move)){
      //+++ todo: beep or something
      console.warn('invalid move');
      result.reason = 'invalid move';
      return result
    }

    const validMoves = this.player.getPossibleMoves(theBoard);
    const jumpMoves = Move.filterJumps(validMoves);
    if (jumpMoves.length){
      if (jumpMoves.find(jumpMove => jumpMove.isEqual(move)) === undefined){
        this._showAlert('You must jump a piece.');
        result.reason = 'must jump';
        result.forcedJumpMoves = jumpMoves;
        return result;
      }
    }

    this._executeMove(this.player, move).then( noOp );

    result.ok = true;
    return result;
  }

  _opponent(player: Player): Player {
    return player.pieceType === this.player.pieceType ? this.opponent : this.player;
  }

  _pickMove(player: Player){
    if (this._worker === undefined) throw 'must call setWorker';
    this.busy = true;
    this.progressCallback(0);
    this._worker.postMessage({
       message:'startEvaluation',
       player: player.serialize(),
       board: theBoard.serialize(),
       move: this.moves.length,
       debugPiece: this._debugPiece !== null ? this._debugPiece.serialize() : null
       });
  }

  _suggestADraw(player: Player){
    if (this._worker === undefined) throw 'must call setWorker';
    this.busy = true;
    this.progressCallback(0);
    this._worker.postMessage({
      message:'drawRequest',
      player: player.serialize(),
      board: theBoard.serialize(),
      move: this.moves.length
    });
  }

  _pickNextAiVsAiMove(player: Player){
    if (!this.finished()) {
      setTimeout(()=>{
        this._pickMove(player);
      }, 100)
    }
  }

  moveForMe(){
    this._enqueueCommand( () => {
      this._pickMove(this.player);
    })
  }
  
  save(asSnapshot: boolean): string {
    let state = GameData.serializeGame(this, this._gameData, asSnapshot);
    let data = new Blob([JSON.stringify(state)], {type: 'text/json'});
    if (this._saveObjectUrlString){
      // Delete previously allocated ObjectUrlString from DOM
      window.URL.revokeObjectURL(this._saveObjectUrlString);
    }
    this._saveObjectUrlString = window.URL.createObjectURL(data);
    return this._saveObjectUrlString;
  }

  private _uploadToServer(){
    let state = GameData.serializeGame(this, this._gameData, false);
    let url = location.toString().replace(/[^/]+$/, '');
    url += 'storeGame.php';
    //  srAjax.send(JSON.stringify(state), url, result => {
    //    console.log('send result:' + JSON.stringify(result));
    //  })
  }
  
  load(file: File): Promise<void> {
    return new Promise( (resolve, _reject) => {
      let reader = new FileReader();
      reader.onload = e => {
        const rawFileData = e.target?.result as string;
        const data = sr.parseJson(rawFileData);
        const dataCopy = sr.parseJson(rawFileData);
        if (data){
          this._loadGameAndMaybePlayBackMoves(data, dataCopy);
        } else {
          this._showAlert("Error parsing file");
          resolve();
        }
      }
      reader.readAsText(file);
    });
  }

  undo(): Promise<void> {
    return this._undoMove();
  }

  private _loadGameAndMaybePlayBackMoves(data: sr.StringKeyedObject, dataCopy: sr.StringKeyedObject){
    //+++ trying to track down data inconsistency bugs.
    // Found one place where 'data' was being modified after being passed
    // to GameData for safe keeping. Passing in a copy of the data here is
    // a quick and dirty way to ensure it remains unmodified.
    this._gameData = new GameData(dataCopy);
    this._loadGame(data);
    if (!data['moves']) {
      this._setPaused(true);
    } else if (data["moves"]) {
      this._setPaused(false);
      this._playbackMoves(data['moves']);
    }
  }

  private _loadGame(data: sr.StringKeyedObject) {
    this.player = Player.create(data["player"]);
    if (data['opponent']) {
      //+++ games saved with older code didn't include opponent
      this.opponent = Player.create(data["opponent"]);
    } else {
      this.opponent = new Player(srCheckers.opponentPieceType[this.player.pieceType], this.player.strategy);

    }
    this.busy = false;
    this._initializeMoves();

    if (Number.isInteger(data['nextPlayerPieceType'])){
      this._nextPlayerPieceType = data['nextPlayerPieceType'];
    }

    if (data['board']) {
      theBoard = Board.create(data['board']);
    } else {
      this._initializePieces();
    }
    this.boardInitializedCallback();
  }

  private _playbackMoves(moves: Array<Move>){
    this._playbackMode = true;
    this._movesToPlayBack = moves;
    this._playbackIndex = 0;
    this._playbackNextMove();
  }

  private _getMovePieceType(move: Move): PieceType | undefined {
    let square = theBoard.squareAtRowAndCol(move.startRow, move.startCol);
    return square.pieceType()
  }

  private _playbackNextMove(){
    if (this._pause) return;

    const myPromise = (moveData: Move) => {
      const move = srCheckers.MoveFactory.create(moveData);
      const moveNum = this.moves.length + 1;
      const movePieceType = this._getMovePieceType(move);
      if (this.player.pieceType === movePieceType){
        console.log('Playing back player move ' + moveNum);
        return this._executeMove(this.player, move);
      } else if (movePieceType) {
        console.log('Playing back opponent move ' + moveNum);
        return this._executeMove(this.opponent, move);
      } else {
        throw 'logic error'
      }
    }

    const moveData = this._movesToPlayBack[this._playbackIndex];
    if (moveData){
      myPromise(moveData).then( () => {
          this._playbackIndex++;
          setTimeout( this._playbackNextMove.bind(this), 250);
        })
        .catch( err => {
          this._showAlert("Error replaying game at move " + this._playbackIndex + " : " + err);
          this._playbackMode = false;
        })
    } else {
      this._playbackMode = false;
      this._setPaused(true);
    }
  }

  private _finish(loser: Player | null, state: GameState){
    this._gameState = state;
    this.busy = false;
    this.gameFinishedCallback(loser, state)
    if (REPORT_TO_MOTHER_SHIP){
      this._uploadToServer();
    }
  }

  private _onWorkerMessage(message: sr.StringKeyedObject){
    let move, playerType;
    switch (message["data"]["message"]){
      case 'moveDone':
        playerType = message["data"]["player"];
        move = srCheckers.MoveFactory.create(message["data"]["move"]);
        if (move){
          let projectedNextMoveData = message["data"]["projectedOpponentMove"];
          let projectedNextMove : Move | undefined = undefined;
          if (projectedNextMoveData){
            projectedNextMove = srCheckers.MoveFactory.create(projectedNextMoveData);
          }
          if (playerType === this.player.pieceType){
            this._executeMove(this.player, move, projectedNextMove).then( noOp );
          } else {
            this._executeMove(this.opponent, move, projectedNextMove).then( noOp );
          }
        }
        break;
      case 'drawResponse':
        this._onDrawResponse(message["data"]["response"]);
        break;
      case 'progress':
        this.progressCallback(message["data"]["value"]);
        break;
    }
  }
  private _dispatchMoveFinishedEvent(){
    this.dispatchEvent(new Event('moveFinished'))
  }
  private _onWorkerError(error: Error){
    console.error(error);
    this.busy = false;
    this._dispatchMoveFinishedEvent();
  }
  private _onWorkerMessageError(error: Error){
    console.error('MessageError: ' + error);
    this.busy = false;
    this._dispatchMoveFinishedEvent();
  }

  private _onDrawResponse(ok: boolean){
    this.busy = false;
    this._dispatchMoveFinishedEvent();
    if (ok){
      this._finish(null, GameState.GAME_OVER_DRAW);
    } else {
      this._showAlert("How about we keep playing? You can also resign.")
    }
    this._serviceCommandQueue()
  }

  private _registerSurprise(move: Move){
    if (!!this._projectedNextMove && !this._aiVsAiMode && !this._playbackMode){
      if (this._projectedNextMove.isEqual(move) === false){
        const message = `Hmm. I expected ${this._projectedNextMove.toString()}.`
        // this._showAlert(`Hmm. I expected ${this._projectedNextMove.toString()}.`);
        console.log(message);
      }
    }
  }

  private _executeMove(player: Player, move: Move, projectedNextMove?: Move | undefined): Promise<void> {
    sr.assert(!!player);
    sr.assert(!!move);
    this._debugPiece = null;
    if (move){
      return Animator.execute(theBoard, move)
        .then(()=> {
          this._registerSurprise(move);
          this._projectedNextMove = projectedNextMove;
          this.busy = false;
          this.moves.push(move);
          this._nextPlayerPieceType = srCheckers.opponentPieceType[player.pieceType];
          this._dispatchMoveFinishedEvent();
          this._serviceCommandQueue()
            .then( () => {
              this._doPostExecuteMoveAction(player);
            })

        });
    }

    return Promise.resolve();
  }

  private _doPostExecuteMoveAction(player: Player){
    const opponent = this._opponent(player);
    if (this._playbackMode){
      // Do nothing
    } else if (player.hasNoPieces(theBoard)){
      this._finish(player, GameState.GAME_OVER_NO_PIECES);
    } else if (opponent.hasNoPieces(theBoard)){
      this._finish(opponent, GameState.GAME_OVER_NO_PIECES);
    } else if (opponent.hasMoves(theBoard) === false){
      this._finish(opponent, GameState.GAME_OVER_NO_MOVES);
    } else if (this._aiVsAiMode){
      if (!this._pause) {
        this._pickNextAiVsAiMove(this._opponent(player));
      }
    } else if (player === this.player){
      if (!this._pause) {
        this._pickMove(this.opponent);
      }
    }
  }

  private _undoMove(){
    let move = this.moves.pop();
    if (!move) {
      return Promise.resolve();
    } else {
      return Animator.undo(theBoard, move)
        .then( movedPiece =>{
          this._gameState = GameState.GAME_IN_PROGRESS;
          this.player.resigned = false;
          this.opponent.resigned = false;
          this._nextPlayerPieceType = movedPiece.pieceType() as PieceType;
          if (this._playbackMode){
            this._playbackIndex--;
          } else if ( movedPiece.pieceType() === this.player.pieceType && !this.pause){
            this._setPaused(true);
            this._showAlert('Unpause the game to continue playing.');
          }
        })
    }
  }

  private _enqueueCommand( c: Command ){
    if (this.busy){
      this._commandQueue.push(c);
    } else {
      c();
    }
  }

  private _serviceCommandQueue(){

    const promisifyFunction = (fn: Command) => {
      fn();
      return Promise.resolve();
    };
    const commandQueue = this._commandQueue;
    this._commandQueue = [];
    return commandQueue.reduce(
      (accumulator, current) => accumulator.then( () => promisifyFunction(current)),
      Promise.resolve()
    );

  }

  private _showAlert(message: string){
       setTimeout(()=>{
         this.showAlertCallback(message);
       }, 500);
  }
}


export function _getPieceContainerElement(row: number, col: number) : Element {
  let result = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
  if (!result) throw 'query failed';
  return result;
}

export var theGame = new Game();


