'use client';

import React, { useEffect, useRef } from 'react';
import { MoveRecord } from '../../lib/types';
import { useTranslation } from '../../i18n/LanguageContext';
import { Radio } from 'lucide-react';

interface MoveHistoryProps {
  moves: MoveRecord[];
  previewPly: number | null;
  onSelectPly: (ply: number | null) => void;
}

export const MoveHistory: React.FC<MoveHistoryProps> = ({
  moves,
  previewPly,
  onSelectPly,
}) => {
  const { t } = useTranslation();
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Group moves into pairs (White & Black)
  const moveRows: {
    moveNumber: number;
    white?: MoveRecord;
    black?: MoveRecord;
  }[] = [];

  for (let i = 0; i < moves.length; i += 2) {
    moveRows.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
    });
  }

  // Auto-scroll to bottom when new moves are added and not previewing
  useEffect(() => {
    if (previewPly === null && tableContainerRef.current) {
      tableContainerRef.current.scrollTop = tableContainerRef.current.scrollHeight;
    }
  }, [moves.length, previewPly]);

  const renderClassificationChip = (classification?: string) => {
    if (!classification) return null;

    let color = 'var(--text-muted)';
    let bg = 'rgba(255, 255, 255, 0.05)';
    let label = classification;

    if (classification === 'best') {
      color = '#98c379';
      bg = 'rgba(152, 195, 121, 0.15)';
      label = t.evalBest;
    } else if (classification === 'good') {
      color = 'var(--accent-strong)';
      bg = 'rgba(154, 168, 116, 0.15)';
      label = t.evalGood;
    } else if (classification === 'inaccuracy') {
      color = '#e5c07b';
      bg = 'rgba(229, 192, 123, 0.15)';
      label = t.evalInaccuracy;
    } else if (classification === 'mistake') {
      color = '#d19a66';
      bg = 'rgba(209, 154, 102, 0.15)';
      label = t.evalMistake;
    } else if (classification === 'blunder') {
      color = 'var(--danger)';
      bg = 'rgba(192, 86, 75, 0.2)';
      label = t.evalBlunder;
    }

    return (
      <span
        style={{
          fontSize: '9px',
          fontFamily: 'var(--font-mono)',
          padding: '1px 4px',
          borderRadius: '3px',
          color,
          backgroundColor: bg,
          marginLeft: '4px',
        }}
      >
        {label}
      </span>
    );
  };

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '16px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Row: Micro Label & Ply Count */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
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
          {t.moveHistory}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {previewPly !== null && (
            <button
              onClick={() => onSelectPly(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 6px',
                backgroundColor: 'rgba(125, 138, 94, 0.2)',
                border: '1px solid var(--accent)',
                borderRadius: '4px',
                color: 'var(--accent-strong)',
                fontSize: '10px',
                fontFamily: 'var(--font-mono)',
                cursor: 'pointer',
              }}
            >
              <Radio size={10} />
              {t.viewLive}
            </button>
          )}
          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '11px',
              color: 'var(--text-muted)',
            }}
          >
            {moves.length} {t.ply}
          </span>
        </div>
      </div>

      {/* History Preview Notice */}
      {previewPly !== null && (
        <div
          style={{
            fontSize: '11px',
            padding: '4px 8px',
            backgroundColor: 'var(--surface-2)',
            borderRadius: '4px',
            borderLeft: '3px solid var(--accent-strong)',
            color: 'var(--text)',
          }}
        >
          {t.historyPreviewNotice.replace('{move}', previewPly.toString())}
        </div>
      )}

      {/* Table Header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '40px 1fr 1fr',
          padding: '6px 8px',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
        }}
      >
        <span>#</span>
        <span>{t.white}</span>
        <span>{t.black}</span>
      </div>

      {/* Table Scroll Area */}
      <div
        ref={tableContainerRef}
        style={{
          height: '180px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {moveRows.length === 0 ? (
          <div
            style={{
              padding: '24px 0',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '12px',
              fontStyle: 'italic',
            }}
          >
            Belum ada langkah yang dimainkan.
          </div>
        ) : (
          moveRows.map((row) => {
            const isWhiteActive = previewPly === row.white?.ply;
            const isBlackActive = previewPly === row.black?.ply;

            return (
              <div
                key={row.moveNumber}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '40px 1fr 1fr',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  alignItems: 'center',
                }}
              >
                {/* Move Number */}
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
                  {row.moveNumber}.
                </span>

                {/* White Move */}
                <div
                  onClick={() => row.white && onSelectPly(row.white.ply)}
                  style={{
                    cursor: row.white ? 'pointer' : 'default',
                    color: row.white?.forfeitRandom ? 'var(--danger)' : 'var(--text)',
                    backgroundColor: isWhiteActive ? 'rgba(125, 138, 94, 0.25)' : 'transparent',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: isWhiteActive ? 700 : 500,
                  }}
                  title={row.white ? `Langkah ${row.white.ply}: ${row.white.san}` : ''}
                >
                  <span>{row.white?.san || ''}</span>
                  {renderClassificationChip(row.white?.classification)}
                </div>

                {/* Black Move */}
                <div
                  onClick={() => row.black && onSelectPly(row.black.ply)}
                  style={{
                    cursor: row.black ? 'pointer' : 'default',
                    color: row.black?.forfeitRandom ? 'var(--danger)' : 'var(--text)',
                    backgroundColor: isBlackActive ? 'rgba(125, 138, 94, 0.25)' : 'transparent',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    fontWeight: isBlackActive ? 700 : 500,
                  }}
                  title={row.black ? `Langkah ${row.black.ply}: ${row.black.san}` : ''}
                >
                  <span>{row.black?.san || ''}</span>
                  {renderClassificationChip(row.black?.classification)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
