import React from 'react';
import { useTranslation } from '../../i18n/LanguageContext';
import { BarChart3, Trophy, Sliders, Sparkles } from 'lucide-react';

interface HeaderProps {
  mockEnabled?: boolean;
  onOpenSettings: () => void;
  onOpenScoreboard: () => void;
  onOpenReplay: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  mockEnabled = false,
  onOpenSettings,
  onOpenScoreboard,
  onOpenReplay,
}) => {
  const { locale, setLocale, t } = useTranslation();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 24px',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--surface)',
        width: '100%',
        maxWidth: '1100px',
        margin: '0 auto',
        boxSizing: 'border-box',
        borderRadius: '0 0 var(--radius-card) var(--radius-card)',
      }}
    >
      {/* Brand logo & tagline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '6px',
            backgroundColor: 'var(--accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '14px',
            fontFamily: 'var(--font-mono)',
          }}
        >
          ♚
        </div>
        <span
          style={{
            fontSize: '15px',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
          }}
        >
          {t.appTitle}
        </span>

        {mockEnabled && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '10px',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color: '#ea9a2a',
              backgroundColor: 'rgba(234, 154, 42, 0.15)',
              border: '1px solid rgba(234, 154, 42, 0.3)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
          >
            <Sparkles size={11} />
            MOCK
          </span>
        )}
      </div>

      {/* Actions: Settings, Scoreboard, Saved Games, i18n switcher */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        {/* Settings Button */}
        <button
          onClick={onOpenSettings}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 11px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text)',
            fontSize: '11px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'color 150ms ease, border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent-strong)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <Sliders size={13} color="var(--accent-strong)" />
          <span>Settings</span>
        </button>

        {/* Scoreboard Button */}
        <button
          onClick={onOpenScoreboard}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'color 150ms ease, border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <BarChart3 size={13} />
          <span>{t.scoreboard}</span>
        </button>

        {/* Saved Games Button */}
        <button
          onClick={onOpenReplay}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'color 150ms ease, border-color 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text)';
            e.currentTarget.style.borderColor = 'var(--accent)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <Trophy size={13} />
          <span>{t.savedGames}</span>
        </button>

        {/* Language Switcher */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-control)',
            padding: '2px',
          }}
        >
          <button
            onClick={() => setLocale('id')}
            style={{
              padding: '3px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: locale === 'id' ? 'var(--accent)' : 'transparent',
              color: locale === 'id' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            ID
          </button>
          <button
            onClick={() => setLocale('en')}
            style={{
              padding: '3px 8px',
              border: 'none',
              borderRadius: '4px',
              backgroundColor: locale === 'en' ? 'var(--accent)' : 'transparent',
              color: locale === 'en' ? '#ffffff' : 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 600,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
            }}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
};
