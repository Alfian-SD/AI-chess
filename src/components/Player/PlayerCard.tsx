'use client';

import React from 'react';
import { PlayerConfig, PlayerColor, PlayerState, PieceCode } from '../../lib/types';
import { PieceImage } from '../../lib/piece-renderer';
import { useTranslation } from '../../i18n/LanguageContext';

interface PlayerCardProps {
  player: PlayerConfig;
  color: PlayerColor;
  state: PlayerState;
  capturedPieces: PieceCode[];
}

export const PlayerCard: React.FC<PlayerCardProps> = ({
  player,
  color,
  state,
  capturedPieces,
}) => {
  const { t } = useTranslation();
  const isWhite = color === 'w';

  // Badge label and styles
  let badgeText = t.stateWaiting;
  let badgeStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
    border: '1px solid var(--border)',
    background: 'transparent',
  };

  if (state === 'thinking') {
    badgeText = t.stateThinking;
    badgeStyle = {
      color: 'var(--accent-strong)',
      border: '1px solid rgba(154, 168, 116, 0.4)',
      background: 'rgba(125, 138, 94, 0.18)',
    };
  } else if (state === 'finished') {
    badgeText = t.stateFinished;
    badgeStyle = {
      color: 'var(--accent-strong)',
      border: '1px solid var(--accent)',
      background: 'rgba(125, 138, 94, 0.1)',
    };
  } else if (state === 'error') {
    badgeText = t.stateError;
    badgeStyle = {
      color: 'var(--danger)',
      border: '1px solid rgba(192, 86, 75, 0.5)',
      background: 'rgba(192, 86, 75, 0.15)',
    };
  }

  const kingPiece = isWhite ? 'wK' : 'bK';
  const metaColorText = isWhite ? t.white : t.black;
  const metaProviderText = (player.provider || 'AI').toUpperCase();

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '6px 12px',
        height: '46px',
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-control)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Left: Avatar + Name + Meta */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
        {/* Avatar tile */}
        <div
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '6px',
            backgroundColor: isWhite ? 'var(--board-light)' : 'var(--surface-2)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <PieceImage piece={kingPiece} size={24} />
        </div>

        {/* Name and Meta */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span
            style={{
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '180px',
            }}
          >
            {player.displayName}
          </span>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            }}
          >
            {metaProviderText} - {metaColorText}
          </span>
        </div>
      </div>

      {/* Center/Right: Captured Pieces */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
        {capturedPieces.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1px',
              maxWidth: '140px',
              overflowX: 'auto',
            }}
            title="Captured pieces"
          >
            {capturedPieces.map((piece, idx) => (
              <div key={idx} style={{ width: '18px', height: '18px', flexShrink: 0 }}>
                <PieceImage piece={piece} size={18} />
              </div>
            ))}
          </div>
        )}

        {/* Right: Badges & State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Temperature badge */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 500,
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              whiteSpace: 'nowrap',
            }}
            title={`Sampling Temperature: ${player.temperature ?? 0.7}`}
          >
            T: {(player.temperature ?? 0.7).toFixed(1)}
          </div>

          {/* Explicit Mock indicator */}
          {player.provider === 'mock' && (
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.06em',
                padding: '2px 5px',
                borderRadius: '4px',
                backgroundColor: 'rgba(234, 154, 42, 0.15)',
                border: '1px solid rgba(234, 154, 42, 0.4)',
                color: '#ea9a2a',
                whiteSpace: 'nowrap',
              }}
              title="Simulated Mock Model"
            >
              MOCK
            </div>
          )}

          {/* State badge */}
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.08em',
              padding: '3px 8px',
              borderRadius: '4px',
              textTransform: 'uppercase',
              whiteSpace: 'nowrap',
              ...badgeStyle,
            }}
          >
            {badgeText}
          </div>
        </div>
      </div>
    </div>
  );
};
