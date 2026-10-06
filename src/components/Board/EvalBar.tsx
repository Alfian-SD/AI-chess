'use client';

import React from 'react';
import { EvalResult } from '../../hooks/useStockfish';

interface EvalBarProps {
  evaluation?: EvalResult;
  height?: number | string;
  orientation?: 'white' | 'black';
}

export const EvalBar: React.FC<EvalBarProps> = ({
  evaluation,
  height = '100%',
  orientation = 'white',
}) => {
  const cp = evaluation?.cp ?? 0;
  const mate = evaluation?.mate;

  // Calculate percentage for White's share of bar [0..100]
  // 50% = equal (0 cp)
  // Win threshold ~ 1000 cp (+10 pawns)
  let whitePercent = 50;

  if (mate !== undefined) {
    whitePercent = mate > 0 ? 100 : 0;
  } else {
    // Sigmoid or soft clamp: 50 + 50 * (2 / (1 + exp(-0.004 * cp)) - 1)
    const normalized = Math.max(-1000, Math.min(1000, cp));
    whitePercent = 50 + (normalized / 1000) * 45;
  }

  // Adjust display if board is flipped
  const displayWhitePercent = orientation === 'white' ? whitePercent : 100 - whitePercent;

  let scoreText = '0.0';
  if (mate !== undefined) {
    scoreText = `M${Math.abs(mate)}`;
  } else {
    const pawns = (Math.abs(cp) / 100).toFixed(1);
    scoreText = cp > 0 ? `+${pawns}` : cp < 0 ? `-${pawns}` : '0.0';
  }

  return (
    <div
      style={{
        width: '18px',
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#1b1b1b',
        borderRadius: '6px',
        border: '1px solid var(--border)',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        overflow: 'hidden',
        boxSizing: 'border-box',
        boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.5)',
      }}
      title={`Evaluation: ${scoreText} (Depth: ${evaluation?.depth || '-'})`}
    >
      {/* White portion */}
      <div
        style={{
          width: '100%',
          height: `${displayWhitePercent}%`,
          backgroundColor: 'var(--board-light)',
          transition: 'height 300ms ease-out',
        }}
      />

      {/* Numerical score badge */}
      <div
        style={{
          position: 'absolute',
          top: orientation === 'white' && displayWhitePercent > 50 ? 'auto' : '4px',
          bottom: orientation === 'white' && displayWhitePercent <= 50 ? 'auto' : '4px',
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          fontWeight: 700,
          color: displayWhitePercent > 50 ? '#1b1b1b' : '#e6e8d5',
          pointerEvents: 'none',
          lineHeight: 1,
        }}
      >
        {scoreText}
      </div>
    </div>
  );
};
