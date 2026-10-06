'use client';

import React, { useState } from 'react';
import { MatchStatus, PlayerConfig, MatchSettings } from '../../lib/types';
import { useTranslation } from '../../i18n/LanguageContext';
import { Play, Pause, RotateCcw, StepForward, Settings2, RefreshCw, AlertCircle } from 'lucide-react';
import { ModelSelectorModal } from './ModelSelectorModal';

interface MatchControlProps {
  status: MatchStatus;
  settings: MatchSettings;
  whiteConfig: PlayerConfig;
  blackConfig: PlayerConfig;
  errorMessage?: string;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => void;
  onRetry: () => void;
  onSetMoveDelay: (delay: number) => void;
  onSetMaxPly: (maxPly: number) => void;
  onSavePlayerConfigs: (white: PlayerConfig, black: PlayerConfig) => void;
}

export const MatchControl: React.FC<MatchControlProps> = ({
  status,
  settings,
  whiteConfig,
  blackConfig,
  errorMessage,
  onStart,
  onPause,
  onReset,
  onStep,
  onRetry,
  onSetMoveDelay,
  onSetMaxPly,
  onSavePlayerConfigs,
}) => {
  const { t } = useTranslation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Status Badge Styling
  let statusBadgeText = t.statusIdle;
  let statusBadgeColor = 'var(--text-muted)';
  let statusBadgeBorder = 'var(--border)';

  if (status === 'running') {
    statusBadgeText = t.statusRunning;
    statusBadgeColor = 'var(--accent-strong)';
    statusBadgeBorder = 'var(--accent)';
  } else if (status === 'paused') {
    statusBadgeText = t.statusPaused;
    statusBadgeColor = '#e5c07b';
    statusBadgeBorder = '#e5c07b';
  } else if (status === 'finished') {
    statusBadgeText = t.statusFinished;
    statusBadgeColor = 'var(--accent-strong)';
    statusBadgeBorder = 'var(--accent-strong)';
  } else if (status === 'error') {
    statusBadgeText = t.statusError;
    statusBadgeColor = 'var(--danger)';
    statusBadgeBorder = 'var(--danger)';
  }

  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isFinished = status === 'finished';

  return (
    <div
      style={{
        backgroundColor: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-card)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {/* Header Row: Micro Label & Status Badge */}
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
          {t.matchControl}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            padding: '2px 8px',
            borderRadius: '4px',
            border: `1px solid ${statusBadgeBorder}`,
            color: statusBadgeColor,
            fontWeight: 600,
          }}
        >
          {statusBadgeText}
        </span>
      </div>

      {/* Headline & Subtitle */}
      <div>
        <h1
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: 'var(--text)',
            letterSpacing: '-0.02em',
            marginBottom: '4px',
          }}
        >
          {t.headline}
        </h1>
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            lineHeight: 1.4,
          }}
        >
          {t.subtitle}
        </p>
      </div>

      <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '2px 0' }} />

      {/* Players Row (Interactive to configure) */}
      <div
        onClick={() => setIsModalOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          backgroundColor: 'var(--surface-2)',
          borderRadius: 'var(--radius-control)',
          border: '1px solid var(--border)',
          cursor: 'pointer',
          transition: 'border-color 150ms ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent)')}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border)')}
        title="Klik untuk mengubah model AI"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#ffffff', flexShrink: 0 }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '110px',
            }}
          >
            {whiteConfig.displayName}
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-muted)', padding: '0 4px' }}>
            VS
          </span>
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#666666', flexShrink: 0 }} />
          <span
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '110px',
            }}
          >
            {blackConfig.displayName}
          </span>
        </div>
        <Settings2 size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
      </div>

      {/* Selects: Jeda langkah & Batas langkah */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            {t.moveDelay}
          </label>
          <select
            value={settings.moveDelayMs}
            onChange={(e) => onSetMoveDelay(parseInt(e.target.value, 10))}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--text)',
              fontSize: '12px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            <option value={0}>0 {t.seconds}</option>
            <option value={1000}>1 {t.seconds}</option>
            <option value={2000}>2 {t.seconds}</option>
            <option value={5000}>5 {t.seconds}</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
            {t.moveLimit}
          </label>
          <select
            value={settings.maxPly}
            onChange={(e) => onSetMaxPly(parseInt(e.target.value, 10))}
            disabled={isRunning}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--text)',
              fontSize: '12px',
              cursor: isRunning ? 'not-allowed' : 'pointer',
              opacity: isRunning ? 0.6 : 1,
            }}
          >
            <option value={50}>50 {t.ply}</option>
            <option value={100}>100 {t.ply}</option>
            <option value={200}>200 {t.ply}</option>
            <option value={300}>300 {t.ply}</option>
          </select>
        </div>
      </div>

      {/* Error Banner with Retry */}
      {status === 'error' && (
        <div
          style={{
            backgroundColor: 'rgba(192, 86, 75, 0.15)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-control)',
            padding: '10px 12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
            <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0 }} />
            <span
              style={{
                fontSize: '12px',
                color: 'var(--danger)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {errorMessage || 'Error occurred'}
            </span>
          </div>
          <button
            onClick={onRetry}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: 'var(--danger)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 8px',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <RefreshCw size={11} />
            {t.retry}
          </button>
        </div>
      )}

      {/* Primary Action Button (Full width 44px) */}
      <button
        onClick={isRunning ? onPause : onStart}
        disabled={isFinished}
        style={{
          width: '100%',
          height: '44px',
          backgroundColor: isRunning ? '#333333' : 'var(--accent)',
          border: 'none',
          borderRadius: 'var(--radius-control)',
          color: '#ffffff',
          fontSize: '14px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: isFinished ? 'not-allowed' : 'pointer',
          opacity: isFinished ? 0.4 : 1,
          transition: 'background-color 150ms ease',
        }}
        onMouseEnter={(e) => {
          if (!isRunning && !isFinished) e.currentTarget.style.backgroundColor = 'var(--accent-strong)';
        }}
        onMouseLeave={(e) => {
          if (!isRunning && !isFinished) e.currentTarget.style.backgroundColor = 'var(--accent)';
        }}
      >
        {isRunning ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
        <span>
          {isRunning
            ? t.pauseMatch
            : isPaused
            ? t.continueMatch
            : t.startMatch}
        </span>
      </button>

      {/* Secondary Row: Pause, Reset, +1 Langkah */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <button
          onClick={onPause}
          disabled={!isRunning}
          style={{
            height: '36px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: !isRunning ? 'not-allowed' : 'pointer',
            opacity: !isRunning ? 0.4 : 1,
          }}
        >
          <Pause size={13} />
          {t.pause}
        </button>

        <button
          onClick={onReset}
          style={{
            height: '36px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: 'pointer',
          }}
        >
          <RotateCcw size={13} />
          {t.reset}
        </button>

        <button
          onClick={onStep}
          disabled={isRunning || isFinished}
          style={{
            height: '36px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text)',
            fontSize: '12px',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            cursor: isRunning || isFinished ? 'not-allowed' : 'pointer',
            opacity: isRunning || isFinished ? 0.4 : 1,
          }}
        >
          <StepForward size={13} />
          {t.stepMove}
        </button>
      </div>

      {/* Footer Notice */}
      <div
        style={{
          textAlign: 'center',
          fontFamily: 'var(--font-mono)',
          fontSize: '10px',
          color: 'var(--text-muted)',
          letterSpacing: '0.02em',
          marginTop: '4px',
        }}
      >
        {t.liveApiNotice}
      </div>

      {/* Modal for model settings */}
      <ModelSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        whiteConfig={whiteConfig}
        blackConfig={blackConfig}
        onSave={onSavePlayerConfigs}
      />
    </div>
  );
};
