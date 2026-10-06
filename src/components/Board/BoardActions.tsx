'use client';

import React, { useState } from 'react';
import { RotateCw, Copy, Download, Check } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext';

interface BoardActionsProps {
  currentFen: string;
  onFlipBoard: () => void;
  getPgnString: () => string;
}

export const BoardActions: React.FC<BoardActionsProps> = ({
  currentFen,
  onFlipBoard,
  getPgnString,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopyFen = async () => {
    try {
      await navigator.clipboard.writeText(currentFen);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy FEN:', err);
    }
  };

  const handleDownloadPgn = () => {
    const pgn = getPgnString();
    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ai-chess-match-${Date.now()}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const btnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'none',
    border: 'none',
    color: 'var(--text-muted)',
    fontSize: '11px',
    fontWeight: 500,
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '4px',
    transition: 'color 150ms ease, background 150ms ease',
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        width: '100%',
        padding: '6px 0',
      }}
    >
      {/* Flip Board */}
      <button
        onClick={onFlipBoard}
        style={btnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        title={t.flipBoard}
      >
        <RotateCw size={13} />
        <span>{t.flipBoard}</span>
      </button>

      {/* Copy FEN */}
      <button
        onClick={handleCopyFen}
        style={btnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        title={t.copyFen}
      >
        {copied ? <Check size={13} color="var(--accent-strong)" /> : <Copy size={13} />}
        <span style={{ color: copied ? 'var(--accent-strong)' : undefined }}>
          {copied ? t.fenCopied : t.copyFen}
        </span>
      </button>

      {/* Download PGN */}
      <button
        onClick={handleDownloadPgn}
        style={btnStyle}
        onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text)')}
        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
        title={t.downloadPgn}
      >
        <Download size={13} />
        <span>{t.downloadPgn}</span>
      </button>
    </div>
  );
};
