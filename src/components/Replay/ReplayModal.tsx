import React, { useState, useEffect, useRef } from 'react';
import { Match, MoveRecord } from '../../lib/types';
import {
  getSavedMatches,
  deleteSavedMatch,
  clearAllSavedMatches,
  exportMatchesAsJson,
  importMatchesFromJson,
} from '../../lib/storage';
import { useTranslation } from '../../i18n/LanguageContext';
import { exportPgnWithComments } from '../../lib/chess-engine';
import { ChessBoard } from '../Board/ChessBoard';
import {
  X,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronLeft,
  ChevronRight,
  Download,
  Trash2,
  Calendar,
  Trophy,
  Upload,
  FileJson,
} from 'lucide-react';

interface ReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReplayModal: React.FC<ReplayModalProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [savedGames, setSavedGames] = useState<Match[]>([]);
  const [selectedGame, setSelectedGame] = useState<Match | null>(null);
  const [currentPly, setCurrentPly] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const tId = setTimeout(() => {
        setSavedGames(getSavedMatches());
        setSelectedGame(null);
        setCurrentPly(0);
        setIsPlaying(false);
        setFeedbackMsg(null);
      }, 0);
      return () => clearTimeout(tId);
    }
  }, [isOpen]);

  // Replay playback interval
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isPlaying && selectedGame) {
      timer = setInterval(() => {
        setCurrentPly((prev) => {
          if (prev >= selectedGame.moves.length) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 1200);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isPlaying, selectedGame]);

  if (!isOpen) return null;

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteSavedMatch(id);
    const updated = getSavedMatches();
    setSavedGames(updated);
    if (selectedGame?.id === id) {
      setSelectedGame(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Hapus semua pertandingan yang tersimpan di browser ini?')) {
      clearAllSavedMatches();
      setSavedGames([]);
      setSelectedGame(null);
      setFeedbackMsg('Semua data pertandingan telah dihapus.');
    }
  };

  const handleExportSingleJson = (game: Match) => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(game, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `chess-game-${game.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleDownloadPgn = (game: Match) => {
    const pgn = exportPgnWithComments(game);
    const blob = new Blob([pgn], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chess-game-${game.id}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      const res = importMatchesFromJson(content);
      if (res.success) {
        setSavedGames(getSavedMatches());
        setFeedbackMsg(`Berhasil mengimpor ${res.count} pertandingan.`);
      } else {
        setFeedbackMsg(`Gagal mengimpor: ${res.error || 'Format JSON tidak valid'}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // When a game is selected, determine displayed FEN and move
  const displayedFen = selectedGame
    ? currentPly === 0
      ? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
      : selectedGame.moves[currentPly - 1]?.fenAfter || selectedGame.currentFen
    : '';

  const activeMove: MoveRecord | undefined =
    selectedGame && currentPly > 0 ? selectedGame.moves[currentPly - 1] : undefined;

  const lastMoveSquares = activeMove ? [activeMove.from, activeMove.to] : [];

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '920px',
          height: '85vh',
          backgroundColor: 'var(--surface)',
          borderRadius: 'var(--radius-card)',
          border: '1px solid var(--border)',
          boxShadow: '0 20px 48px rgba(0,0,0,0.7)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Trophy size={18} color="var(--accent-strong)" />
            <h2 style={{ fontSize: '16px', fontWeight: 600 }}>
              {selectedGame
                ? `${t.replayMode}: ${selectedGame.white.displayName} vs ${selectedGame.black.displayName}`
                : t.savedGames}
            </h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {selectedGame && (
              <button
                onClick={() => {
                  setSelectedGame(null);
                  setIsPlaying(false);
                }}
                style={{
                  background: 'none',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                  borderRadius: '4px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                Kembali ke Daftar
              </button>
            )}
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Action Bar for List View (Export All, Import, Clear All) */}
        {!selectedGame && (
          <div
            style={{
              padding: '10px 20px',
              backgroundColor: 'var(--surface-2)',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={exportMatchesAsJson}
                disabled={savedGames.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text)',
                  fontSize: '11px',
                  cursor: savedGames.length === 0 ? 'not-allowed' : 'pointer',
                  opacity: savedGames.length === 0 ? 0.5 : 1,
                }}
              >
                <FileJson size={13} color="var(--accent-strong)" />
                <span>Ekspor Semua (JSON)</span>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '6px 10px',
                  backgroundColor: 'var(--surface)',
                  border: '1px solid var(--border)',
                  borderRadius: '6px',
                  color: 'var(--text)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <Upload size={13} />
                <span>Impor (JSON)</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={handleFileUpload}
              />
            </div>

            {savedGames.length > 0 && (
              <button
                onClick={handleClearAll}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 8px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--danger)',
                  fontSize: '11px',
                  cursor: 'pointer',
                }}
              >
                <Trash2 size={12} />
                <span>Hapus Semua</span>
              </button>
            )}
          </div>
        )}

        {/* Feedback message */}
        {feedbackMsg && (
          <div
            style={{
              padding: '8px 20px',
              backgroundColor: 'rgba(125, 138, 94, 0.15)',
              fontSize: '11px',
              color: 'var(--accent-strong)',
              borderBottom: '1px solid var(--border)',
            }}
          >
            {feedbackMsg}
          </div>
        )}

        {/* Modal Content */}
        {!selectedGame ? (
          /* List of Saved Games */
          <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
            {savedGames.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
                {t.noSavedGames}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {savedGames.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => {
                      setSelectedGame(game);
                      setCurrentPly(0);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '14px 18px',
                      backgroundColor: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-control)',
                      cursor: 'pointer',
                      transition: 'border-color 150ms ease, background 150ms ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = 'var(--accent)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                          {game.white.displayName}
                        </span>
                        <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                          VS
                        </span>
                        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)' }}>
                          {game.black.displayName}
                        </span>
                        <span
                          style={{
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(125, 138, 94, 0.2)',
                            color: 'var(--accent-strong)',
                            fontWeight: 700,
                          }}
                        >
                          {game.result || '*'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px', color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {new Date(game.createdAt).toLocaleDateString()}
                        </span>
                        <span>
                          {game.moves.length} {t.ply}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadPgn(game);
                        }}
                        style={{
                          padding: '6px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                        }}
                        title={t.downloadPgn}
                      >
                        <Download size={15} />
                      </button>
                      <button
                        onClick={(e) => handleDelete(game.id, e)}
                        style={{
                          padding: '6px',
                          background: 'none',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                        }}
                        title="Hapus"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* Replay Mode View */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '20px',
              padding: '20px',
              flex: 1,
              overflowY: 'auto',
            }}
          >
            {/* Left: Replay Board */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
              <ChessBoard fen={displayedFen} orientation="white" lastMoveSquares={lastMoveSquares} />

              {/* Timeline Slider & Navigation Controls */}
              <div style={{ width: '100%', maxWidth: '420px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '12px',
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  <span>
                    Ply: {currentPly} / {selectedGame.moves.length}
                  </span>
                  <span>{activeMove ? `${activeMove.color === 'w' ? 'White' : 'Black'}: ${activeMove.san}` : 'Start'}</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={selectedGame.moves.length}
                  value={currentPly}
                  onChange={(e) => setCurrentPly(parseInt(e.target.value, 10))}
                  style={{ width: '100%', accentColor: 'var(--accent)' }}
                />

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                  <button
                    onClick={() => setCurrentPly(0)}
                    disabled={currentPly === 0}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <SkipBack size={18} />
                  </button>
                  <button
                    onClick={() => setCurrentPly((p) => Math.max(0, p - 1))}
                    disabled={currentPly === 0}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent)',
                      border: 'none',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} fill="currentColor" />}
                  </button>
                  <button
                    onClick={() => setCurrentPly((p) => Math.min(selectedGame.moves.length, p + 1))}
                    disabled={currentPly >= selectedGame.moves.length}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <ChevronRight size={20} />
                  </button>
                  <button
                    onClick={() => setCurrentPly(selectedGame.moves.length)}
                    disabled={currentPly >= selectedGame.moves.length}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                  >
                    <SkipForward size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Right: Move Reasoning & Export */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  backgroundColor: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-control)',
                  padding: '16px',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--text-muted)',
                      textTransform: 'uppercase',
                    }}
                  >
                    {t.reasoning}
                  </span>
                  {activeMove && (
                    <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--accent-strong)' }}>
                      {activeMove.latencyMs} {t.milliseconds}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    overflowY: 'auto',
                    fontSize: '13px',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-wrap',
                    color: 'var(--text)',
                  }}
                >
                  {activeMove ? activeMove.reasoning : 'Pilih langkah atau geser slider untuk melihat penalaran model.'}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleExportSingleJson(selectedGame)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'var(--surface-2)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-control)',
                    color: 'var(--text)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {t.exportJson}
                </button>
                <button
                  onClick={() => handleDownloadPgn(selectedGame)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    backgroundColor: 'var(--accent)',
                    border: 'none',
                    borderRadius: 'var(--radius-control)',
                    color: '#ffffff',
                    fontSize: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {t.downloadPgn}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
