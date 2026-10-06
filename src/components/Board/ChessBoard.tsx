'use client';

import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Chessboard } from 'react-chessboard';
import { getCustomPieces, preloadPieceImages } from '../../lib/piece-renderer';
import { EvalBar } from './EvalBar';
import { EvalResult } from '../../hooks/useStockfish';

interface ChessBoardProps {
  fen: string;
  orientation: 'white' | 'black';
  lastMoveSquares?: string[]; // e.g. ['e2', 'e4']
  evaluation?: EvalResult;
  lastMoveAnnouncement?: string;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation,
  lastMoveSquares = [],
  evaluation,
  lastMoveAnnouncement,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [boardWidth, setBoardWidth] = useState<number>(440);

  useEffect(() => {
    preloadPieceImages();
  }, []);

  // Responsive board width calculation
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const availableWidth = containerRef.current.clientWidth - 28; // account for eval bar & gap
        const capped = Math.min(480, Math.max(280, availableWidth));
        setBoardWidth(capped);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Custom square styles for last-move highlight
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};
    if (lastMoveSquares && lastMoveSquares.length >= 2) {
      lastMoveSquares.forEach((sq) => {
        styles[sq] = {
          backgroundColor: 'var(--move-highlight)',
          transition: 'background-color 120ms ease-out',
        };
      });
    }
    return styles;
  }, [lastMoveSquares]);

  const customPieces = useMemo(() => getCustomPieces(), []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        maxWidth: '480px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        margin: '0 auto',
      }}
    >
      {/* Screen reader live announcement */}
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: 0,
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        {lastMoveAnnouncement || 'Chess board ready'}
      </div>

      {/* Eval Bar on the left */}
      <EvalBar
        evaluation={evaluation}
        height={boardWidth}
        orientation={orientation}
      />

      {/* The Chessboard */}
      <div
        style={{
          width: boardWidth,
          height: boardWidth,
          position: 'relative',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid var(--border)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          backgroundColor: 'var(--surface)',
        }}
      >
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            pieces: customPieces,
            squareStyles: customSquareStyles,
            darkSquareStyle: { backgroundColor: 'var(--board-dark)' },
            lightSquareStyle: { backgroundColor: 'var(--board-light)' },
            animationDurationInMs: 180,
            allowDragging: false,
            boardStyle: {
              borderRadius: '4px',
            },
          }}
        />
      </div>
    </div>
  );
};
