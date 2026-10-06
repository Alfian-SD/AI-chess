'use client';

import React, { useState } from 'react';
import { useChessGame } from '../hooks/useChessGame';
import { Header } from '../components/Header/Header';
import { PlayerCard } from '../components/Player/PlayerCard';
import { ChessBoard } from '../components/Board/ChessBoard';
import { BoardActions } from '../components/Board/BoardActions';
import { MatchControl } from '../components/Control/MatchControl';
import { MoveCommentary } from '../components/Commentary/MoveCommentary';
import { MoveHistory } from '../components/History/MoveHistory';
import { Mascot } from '../components/Mascot/Mascot';
import { ScoreboardModal } from '../components/Scoreboard/ScoreboardModal';
import { ReplayModal } from '../components/Replay/ReplayModal';
import { PlayerState } from '../lib/types';

export default function ArenaPage() {
  const {
    match,
    displayedFen,
    displayedMove,
    lastMoveSquares,
    liveReasoning,
    liveReasoningType,
    isThinking,
    currentAttempts,
    boardOrientation,
    previewPly,
    captured,
    currentEval,
    startMatch,
    pauseMatch,
    stepMove,
    resetMatch,
    retryCurrentTurn,
    setMoveDelay,
    setMaxPly,
    setWhitePlayer,
    setBlackPlayer,
    flipBoard,
    selectHistoryPly,
    getPgnString,
  } = useChessGame();

  const [isScoreboardOpen, setIsScoreboardOpen] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);

  // Compute orientation-dependent players for board top and bottom
  const isFlipped = boardOrientation === 'black';
  const topColor = isFlipped ? 'w' : 'b';
  const bottomColor = isFlipped ? 'b' : 'w';
  const topPlayer = topColor === 'w' ? match.white : match.black;
  const bottomPlayer = bottomColor === 'w' ? match.white : match.black;

  // Determine player states
  const getPlayerState = (color: 'w' | 'b'): PlayerState => {
    if (match.status === 'finished') return 'finished';
    if (match.status === 'error' && match.activeColor === color) return 'error';
    if (match.status === 'running') {
      if (match.activeColor === color) {
        return isThinking ? 'thinking' : 'waiting';
      }
      return 'waiting';
    }
    return 'waiting';
  };

  const topState = getPlayerState(topColor);
  const bottomState = getPlayerState(bottomColor);

  const topCaptured = topColor === 'w' ? captured.capturedByWhite : captured.capturedByBlack;
  const bottomCaptured = bottomColor === 'w' ? captured.capturedByWhite : captured.capturedByBlack;

  const activePlayer = match.activeColor === 'w' ? match.white : match.black;

  // Announcement for screen readers
  const lastMoveAnnouncement = displayedMove
    ? `${displayedMove.color === 'w' ? 'White' : 'Black'} plays ${displayedMove.san}`
    : undefined;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg)',
        color: 'var(--text)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <Header
        onOpenScoreboard={() => setIsScoreboardOpen(true)}
        onOpenReplay={() => setIsReplayOpen(true)}
      />

      {/* Main Arena Layout */}
      <main
        style={{
          width: '100%',
          maxWidth: '1100px',
          margin: '0 auto',
          padding: '24px 16px 40px',
          boxSizing: 'border-box',
          flex: 1,
        }}
      >
        <div className="arena-grid">
          {/* Left Column: Board Section */}
          <section className="board-column">
            {/* Top Player Card (Black by default) */}
            <PlayerCard
              player={topPlayer}
              color={topColor}
              state={topState}
              capturedPieces={topCaptured}
            />

            {/* Chessboard with Eval Bar */}
            <ChessBoard
              fen={displayedFen}
              orientation={boardOrientation}
              lastMoveSquares={lastMoveSquares}
              evaluation={currentEval}
              lastMoveAnnouncement={lastMoveAnnouncement}
            />

            {/* Bottom Player Card (White by default) */}
            <PlayerCard
              player={bottomPlayer}
              color={bottomColor}
              state={bottomState}
              capturedPieces={bottomCaptured}
            />

            {/* Board Action Buttons */}
            <BoardActions
              currentFen={displayedFen}
              onFlipBoard={flipBoard}
              getPgnString={getPgnString}
            />
          </section>

          {/* Right Column: Control & Live Analysis */}
          <section className="control-column">
            {/* Match Control Card */}
            <MatchControl
              status={match.status}
              settings={match.settings}
              whiteConfig={match.white}
              blackConfig={match.black}
              errorMessage={match.errorMessage}
              onStart={startMatch}
              onPause={pauseMatch}
              onReset={resetMatch}
              onStep={stepMove}
              onRetry={retryCurrentTurn}
              onSetMoveDelay={setMoveDelay}
              onSetMaxPly={setMaxPly}
              onSavePlayerConfigs={(w, b) => {
                setWhitePlayer(w);
                setBlackPlayer(b);
              }}
            />

            {/* Move Commentary Card */}
            <MoveCommentary
              activePlayer={activePlayer}
              activeColor={match.activeColor}
              isThinking={isThinking}
              liveReasoning={liveReasoning}
              liveReasoningType={liveReasoningType}
              currentAttempts={currentAttempts}
              lastMove={displayedMove}
            />

            {/* Move History Card */}
            <MoveHistory
              moves={match.moves}
              previewPly={previewPly}
              onSelectPly={selectHistoryPly}
            />
          </section>
        </div>
      </main>

      {/* Decorative Fixed Mascot */}
      <Mascot />

      {/* Modals */}
      <ScoreboardModal
        isOpen={isScoreboardOpen}
        onClose={() => setIsScoreboardOpen(false)}
      />

      <ReplayModal
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
      />

      {/* Responsive Styles */}
      <style jsx>{`
        .arena-grid {
          display: grid;
          grid-template-columns: minmax(340px, 480px) minmax(320px, 375px);
          gap: 24px;
          justify-content: center;
          align-items: start;
        }

        .board-column {
          display: flex;
          flex-direction: column;
          gap: 12px;
          width: 100%;
          max-width: 480px;
          margin: 0 auto;
        }

        .control-column {
          display: flex;
          flex-direction: column;
          gap: 16px;
          width: 100%;
          max-width: 375px;
          margin: 0 auto;
        }

        @media (max-width: 900px) {
          .arena-grid {
            display: flex;
            flex-direction: column;
            gap: 20px;
            align-items: center;
          }

          .board-column,
          .control-column {
            max-width: 100%;
            width: 100%;
          }
        }

        @media (max-width: 440px) {
          main {
            padding: 12px 8px 30px !important;
          }
        }
      `}</style>
    </div>
  );
}
