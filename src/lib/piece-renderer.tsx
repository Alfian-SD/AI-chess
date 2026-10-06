'use client';

import React, { useState } from 'react';

export const PIECE_CODES = [
  'wP', 'wN', 'wB', 'wR', 'wQ', 'wK',
  'bP', 'bN', 'bB', 'bR', 'bQ', 'bK'
] as const;

export type PieceCode = typeof PIECE_CODES[number];

export const FALLBACK_GLYPHS: Record<PieceCode, string> = {
  wK: '♔',
  wQ: '♕',
  wR: '♖',
  wB: '♗',
  wN: '♘',
  wP: '♙',
  bK: '♚',
  bQ: '♛',
  bR: '♜',
  bB: '♝',
  bN: '♞',
  bP: '♟',
};

// Preload all 12 piece images
export function preloadPieceImages() {
  if (typeof window === 'undefined') return;
  PIECE_CODES.forEach((code) => {
    const img = new Image();
    img.src = `/pieces/${code}.png`;
  });
}

interface PieceProps {
  piece: PieceCode | string;
  size?: number | string;
  className?: string;
  style?: React.CSSProperties;
}

export const PieceImage: React.FC<PieceProps> = ({ piece, size = '100%', className, style }) => {
  const [hasError, setHasError] = useState(false);
  const code = piece as PieceCode;
  const glyph = FALLBACK_GLYPHS[code] || '?';

  if (hasError) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: size,
          height: size,
          fontSize: typeof size === 'number' ? `${size * 0.75}px` : '1.5em',
          userSelect: 'none',
          ...style,
        }}
        aria-label={code}
      >
        {glyph}
      </span>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/pieces/${code}.png`}
      alt={code}
      className={className}
      onError={() => {
        console.warn(`[PieceRenderer] Missing or failed to load /pieces/${code}.png. Using text glyph '${glyph}'.`);
        setHasError(true);
      }}
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
        display: 'block',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style,
      }}
    />
  );
};

// Custom pieces map for react-chessboard
export function getCustomPieces() {
  const pieces: Record<
    string,
    (props?: { fill?: string; square?: string; svgStyle?: React.CSSProperties }) => React.JSX.Element
  > = {};

  PIECE_CODES.forEach((code) => {
    pieces[code] = () => (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '4%',
          boxSizing: 'border-box',
        }}
      >
        <PieceImage piece={code} size="100%" />
      </div>
    );
  });

  return pieces;
}
