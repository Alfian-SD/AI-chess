'use client';

import React, { useState, useEffect, useRef } from 'react';
import { PlayerConfig, PlayerColor, MoveRecord, MoveAttempt } from '../../lib/types';
import { useTranslation } from '../../i18n/LanguageContext';
import { PieceImage } from '../../lib/piece-renderer';
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

interface MoveCommentaryProps {
  activePlayer: PlayerConfig;
  activeColor: PlayerColor;
  isThinking: boolean;
  liveReasoning: string;
  liveReasoningType: 'reasoning' | 'explanation';
  currentAttempts: MoveAttempt[];
  lastMove?: MoveRecord;
}

export const MoveCommentary: React.FC<MoveCommentaryProps> = ({
  activePlayer,
  activeColor,
  isThinking,
  liveReasoning,
  liveReasoningType,
  currentAttempts,
  lastMove,
}) => {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as tokens stream in
  useEffect(() => {
    if (isThinking && scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [liveReasoning, isThinking]);

  const activeColorName = activeColor === 'w' ? t.white : t.black;
  const avatarPiece = activeColor === 'w' ? 'wN' : 'bN';

  // Determine reasoning text to show
  const displayText = isThinking
    ? liveReasoning
    : lastMove
    ? lastMove.reasoning
    : '';

  const reasoningType = isThinking
    ? liveReasoningType
    : lastMove
    ? lastMove.reasoningType
    : 'explanation';

  const attemptsToShow = isThinking ? currentAttempts : lastMove?.attempts || [];

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Row: Micro Label & Live Pulsing Dot */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              color: 'var(--text-muted)',
              fontWeight: 600,
            }}
          >
            {t.moveCommentary}
          </span>
          {displayText && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                textTransform: 'uppercase',
                backgroundColor: 'var(--surface-2)',
                color: 'var(--accent-strong)',
                border: '1px solid var(--border)',
                padding: '1px 6px',
                borderRadius: '3px',
              }}
            >
              {reasoningType === 'reasoning' ? t.reasoning : t.explanation}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isThinking && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '10px',
                color: 'var(--thinking-dot)',
                fontWeight: 600,
              }}
            >
              LIVE
            </span>
          )}
          <span
            className={isThinking ? 'thinking-pulse' : ''}
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: isThinking ? 'var(--thinking-dot)' : 'var(--border)',
              display: 'inline-block',
            }}
          />
        </div>
      </div>

      {/* Active Model Row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: 'rgba(125, 138, 94, 0.25)',
            border: '1px solid var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <PieceImage piece={avatarPiece} size={18} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
              {activePlayer.displayName}
            </span>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              {isThinking ? t.isThinking : ''}
            </span>
          </div>
          <span
            style={{
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
            }}
          >
            {activeColorName} - {isThinking ? t.choosingLegalMove : 'Langkah terakhir'}
          </span>
        </div>
      </div>

      {/* Red Attempt Error Lines (if any) */}
      {attemptsToShow.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {attemptsToShow.map((att, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                padding: '6px 8px',
                backgroundColor: 'rgba(192, 86, 75, 0.12)',
                borderLeft: '3px solid var(--danger)',
                borderRadius: '4px',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--danger)',
              }}
            >
              <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>{t.failedAttempt} #{idx + 1}:</strong> {att.error || 'Invalid move'}
                {att.san && <span> ({att.san})</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Forfeit Tag Banner */}
      {lastMove?.forfeitRandom && !isThinking && (
        <div
          style={{
            display: 'inline-block',
            padding: '2px 8px',
            backgroundColor: 'rgba(192, 86, 75, 0.2)',
            border: '1px solid var(--danger)',
            borderRadius: '4px',
            color: 'var(--danger)',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.06em',
            alignSelf: 'flex-start',
          }}
        >
          {t.forfeitMove}
        </div>
      )}

      {/* Body: Reasoning Text (Safe Plain Text, role="log") */}
      <div
        ref={scrollContainerRef}
        role="log"
        aria-live="polite"
        style={{
          height: isExpanded ? '280px' : '130px',
          overflowY: 'auto',
          backgroundColor: 'var(--surface-2)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-control)',
          padding: '12px',
          fontSize: '13px',
          lineHeight: 1.5,
          color: 'var(--text)',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          transition: 'height 200ms ease',
        }}
      >
        {displayText ? (
          displayText
        ) : (
          <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', fontSize: '12px' }}>
            {t.emptyCommentary}
          </span>
        )}
      </div>

      {/* Expand / Collapse Toggle if text is long */}
      {displayText.length > 250 && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          style={{
            alignSelf: 'flex-start',
            background: 'none',
            border: 'none',
            color: 'var(--accent-strong)',
            fontSize: '11px',
            fontFamily: 'var(--font-mono)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: 0,
          }}
        >
          {isExpanded ? (
            <>
              <ChevronUp size={12} /> {t.close}
            </>
          ) : (
            <>
              <ChevronDown size={12} /> Lihat penalaran lengkap
            </>
          )}
        </button>
      )}

      {/* Enhanced Footer Row: Provenance Tag, Model, Temp, Latency, Game ID */}
      {lastMove && !isThinking && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            color: 'var(--text-muted)',
            paddingTop: '6px',
            borderTop: '1px solid var(--border)',
          }}
        >
          {/* Top row: Ply & Move SAN + Source Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, color: 'var(--text)' }}>
                {t.move} {lastMove.ply} - {lastMove.san}
              </span>

              {/* Source Tag: LIVE | MOCK | FALLBACK */}
              <span
                style={{
                  fontSize: '9px',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '3px',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                  ...(lastMove.source === 'MOCK'
                    ? { backgroundColor: 'rgba(234, 154, 42, 0.15)', color: '#ea9a2a', border: '1px solid rgba(234, 154, 42, 0.4)' }
                    : lastMove.source === 'FALLBACK'
                    ? { backgroundColor: 'rgba(217, 83, 79, 0.15)', color: '#d9534f', border: '1px solid rgba(217, 83, 79, 0.4)' }
                    : { backgroundColor: 'rgba(125, 138, 94, 0.2)', color: 'var(--accent-strong)', border: '1px solid var(--accent)' }),
                }}
              >
                {lastMove.source || (lastMove.forfeitRandom ? 'FALLBACK' : activePlayer.provider === 'mock' ? 'MOCK' : 'LIVE')}
              </span>
            </div>

            <span>{lastMove.latencyMs} {t.milliseconds}</span>
          </div>

          {/* Bottom metadata row: Provider, Model, Temperature, Game ID */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px',
              fontSize: '9px',
              color: 'var(--text-muted)',
            }}
          >
            <span>
              {lastMove.provider || activePlayer.provider} &bull; {lastMove.model || activePlayer.model} &bull; T: {(lastMove.temperature ?? activePlayer.temperature ?? 0.7).toFixed(1)}
            </span>
            <span title={`Game Session ID: ${lastMove.gameId || 'arena_default'}`} style={{ opacity: 0.8 }}>
              ID: {lastMove.gameId ? lastMove.gameId.slice(0, 16) : 'arena_default'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
