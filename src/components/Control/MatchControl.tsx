import { MatchStatus, PlayerConfig, MatchSettings } from '../../lib/types';
import { useTranslation } from '../../i18n/LanguageContext';
import { getGameEndExplanation } from '../../lib/chess-engine';
import { Play, Pause, RotateCcw, StepForward, Sliders, RefreshCw, AlertCircle, Sparkles } from 'lucide-react';

interface MatchControlProps {
  status: MatchStatus;
  settings: MatchSettings;
  whiteConfig: PlayerConfig;
  blackConfig: PlayerConfig;
  openingName?: string;
  drawReason?: string;
  result?: string;
  terminationReason?: string;
  endExplanation?: string;
  isCheck?: boolean;
  errorMessage?: string;
  isConfigured: boolean;
  onStart: () => boolean | void;
  onPause: () => void;
  onReset: () => void;
  onStep: () => boolean | void;
  onRetry: () => void;
  onSetMoveDelay: (delay: number) => void;
  onSetMaxPly: (maxPly: number) => void;
  onOpenSettings: () => void;
}

export const MatchControl: React.FC<MatchControlProps> = ({
  status,
  settings,
  whiteConfig,
  blackConfig,
  openingName,
  drawReason,
  result,
  terminationReason,
  endExplanation,
  isCheck = false,
  errorMessage,
  isConfigured,
  onStart,
  onPause,
  onReset,
  onStep,
  onRetry,
  onSetMoveDelay,
  onSetMaxPly,
  onOpenSettings,
}) => {
  const { t, locale } = useTranslation();

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
  const isMock = settings.mockEnabled || whiteConfig.provider === 'mock';

  const handleStartClick = () => {
    if (!isConfigured && !isMock) {
      onOpenSettings();
      return;
    }
    onStart();
  };

  const handleStepClick = () => {
    if (!isConfigured && !isMock) {
      onOpenSettings();
      return;
    }
    onStep();
  };

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {isCheck && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#ffffff',
                backgroundColor: 'rgba(239, 68, 68, 0.9)',
                border: '1px solid #ef4444',
                padding: '2px 6px',
                borderRadius: '4px',
                boxShadow: '0 0 8px rgba(239, 68, 68, 0.5)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
              }}
            >
              ⚠️ CHECK
            </span>
          )}
          {isMock && (
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '9px',
                fontWeight: 700,
                color: '#ea9a2a',
                backgroundColor: 'rgba(234, 154, 42, 0.15)',
                border: '1px solid rgba(234, 154, 42, 0.3)',
                padding: '2px 6px',
                borderRadius: '4px',
              }}
            >
              MOCK
            </span>
          )}
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
        onClick={onOpenSettings}
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
        title="Klik untuk konfigurasi model & endpoint AI"
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
            {whiteConfig.displayName || 'White'}
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
            {blackConfig.displayName || 'Black'}
          </span>
        </div>
        <Sliders size={15} color="var(--accent-strong)" style={{ flexShrink: 0 }} />
      </div>

      {/* Unconfigured Warning Banner if empty */}
      {!isConfigured && !isMock && (
        <div
          onClick={onOpenSettings}
          style={{
            padding: '8px 12px',
            backgroundColor: 'rgba(234, 154, 42, 0.1)',
            border: '1px solid rgba(234, 154, 42, 0.3)',
            borderRadius: '6px',
            fontSize: '11px',
            color: '#ea9a2a',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Endpoints not yet configured. Click to set up.</span>
          <Sliders size={13} />
        </div>
      )}

      {/* Selects Row: Move Delay & Move Limit */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            {t.moveDelay}
          </label>
          <select
            value={settings.moveDelayMs}
            onChange={(e) => onSetMoveDelay(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--text)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value={0}>0 ms (Instan)</option>
            <option value={500}>0.5 detik</option>
            <option value={1000}>1 detik (Default)</option>
            <option value={2000}>2 detik</option>
            <option value={5000}>5 detik</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
            {t.moveLimit}
          </label>
          <select
            value={settings.maxPly}
            onChange={(e) => onSetMaxPly(parseInt(e.target.value, 10))}
            style={{
              width: '100%',
              padding: '8px 10px',
              backgroundColor: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-control)',
              color: 'var(--text)',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            <option value={50}>50 langkah</option>
            <option value={100}>100 langkah</option>
            <option value={200}>200 langkah (Default)</option>
            <option value={300}>300 langkah</option>
          </select>
        </div>
      </div>

      {/* Error state message and retry */}
      {status === 'error' && (
        <div
          style={{
            padding: '10px 12px',
            backgroundColor: 'rgba(192, 86, 75, 0.15)',
            border: '1px solid var(--danger)',
            borderRadius: 'var(--radius-control)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertCircle size={16} color="var(--danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <span style={{ fontSize: '12px', color: '#f87171', lineHeight: 1.4 }}>
              {errorMessage || 'Terjadi kesalahan pada provider AI'}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onRetry}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: 'var(--danger)',
                border: 'none',
                borderRadius: '4px',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={11} />
              Coba Lagi (Retry)
            </button>
            <button
              onClick={onOpenSettings}
              style={{
                alignSelf: 'flex-start',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 10px',
                backgroundColor: 'var(--surface-2)',
                border: '1px solid var(--border)',
                borderRadius: '4px',
                color: 'var(--text)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              <Sliders size={11} />
              Open Settings
            </button>
          </div>
        </div>
      )}

      {/* Primary Action Button */}
      {isRunning ? (
        <button
          onClick={onPause}
          style={{
            width: '100%',
            height: '44px',
            backgroundColor: '#c99a3e',
            border: 'none',
            borderRadius: 'var(--radius-control)',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
          }}
        >
          <Pause size={16} />
          {t.pause}
        </button>
      ) : (
        <button
          onClick={handleStartClick}
          disabled={isFinished}
          style={{
            width: '100%',
            height: '44px',
            backgroundColor: isFinished ? 'var(--surface-2)' : 'var(--accent)',
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
            opacity: isFinished ? 0.5 : 1,
          }}
        >
          <Play size={16} fill="currentColor" />
          {isPaused ? t.continueMatch : t.startMatch}
        </button>
      )}

      {/* Secondary Row: Pause, Reset, +1 Move */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
        <button
          onClick={onPause}
          disabled={!isRunning}
          style={{
            padding: '8px 0',
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
            cursor: isRunning ? 'pointer' : 'not-allowed',
            opacity: isRunning ? 1 : 0.4,
          }}
        >
          <Pause size={13} />
          {t.pause}
        </button>

        <button
          onClick={onReset}
          style={{
            padding: '8px 0',
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
          onClick={handleStepClick}
          disabled={isRunning || isFinished}
          style={{
            padding: '8px 0',
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

      {/* Active Opening Repertoire Badge */}
      {openingName && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            backgroundColor: 'rgba(125, 138, 94, 0.15)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-control)',
            padding: '6px 10px',
            fontSize: '11px',
            color: 'var(--accent-strong)',
          }}
        >
          <span style={{ fontWeight: 600 }}>📖 Opening:</span>
          <span>{openingName}</span>
        </div>
      )}

      {/* Game End Result & Rule Explanation */}
      {status === 'finished' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            backgroundColor: 'rgba(125, 138, 94, 0.15)',
            border: '1px solid var(--accent)',
            borderRadius: 'var(--radius-control)',
            padding: '12px 14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
              {result === '1-0'
                ? (locale === 'id' ? 'Kemenangan Putih' : 'White Victory')
                : result === '0-1'
                ? (locale === 'id' ? 'Kemenangan Hitam' : 'Black Victory')
                : (locale === 'id' ? 'Pertandingan Remis' : 'Draw Match')}
            </span>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
                fontWeight: 700,
                color: 'var(--accent-strong)',
                backgroundColor: 'var(--surface-2)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
              }}
            >
              {result || '1/2-1/2'}
            </span>
          </div>

          <div style={{ height: '1px', backgroundColor: 'var(--border)' }} />

          <p style={{ margin: 0, fontSize: '12px', color: 'var(--text)', lineHeight: 1.45 }}>
            {endExplanation ||
              getGameEndExplanation(
                terminationReason,
                result === '1-0' ? 'w' : result === '0-1' ? 'b' : undefined,
                locale
              ) ||
              drawReason ||
              'Game finished.'}
          </p>
        </div>
      )}

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
        {isMock ? 'MOCK MODE - Simulated offline thinking' : t.liveApiNotice}
      </div>
    </div>
  );
};
