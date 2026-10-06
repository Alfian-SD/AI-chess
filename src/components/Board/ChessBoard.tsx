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
  isCheck?: boolean;
  checkKingSquare?: string | null;
}

export const ChessBoard: React.FC<ChessBoardProps> = ({
  fen,
  orientation,
  lastMoveSquares = [],
  evaluation,
  lastMoveAnnouncement,
  isCheck = false,
  checkKingSquare = null,
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

  // Custom square styles for last-move highlight and king check highlight
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

    // Red highlight on the king square when in check
    if (isCheck && checkKingSquare) {
      styles[checkKingSquare] = {
        backgroundColor: 'rgba(239, 68, 68, 0.65)',
        boxShadow: 'inset 0 0 12px 3px rgba(239, 68, 68, 0.95)',
        borderRadius: '4px',
        transition: 'background-color 150ms ease-out',
      };
    }

    return styles;
  }, [lastMoveSquares, isCheck, checkKingSquare]);

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
        {isCheck && (
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              backgroundColor: '#ef4444',
              color: '#ffffff',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              padding: '3px 8px',
              borderRadius: '4px',
              boxShadow: '0 2px 10px rgba(239, 68, 68, 0.7)',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              pointerEvents: 'none',
            }}
          >
            <span style={{ fontSize: '10px' }}>⚠️</span> CHECK
          </div>
        )}
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
