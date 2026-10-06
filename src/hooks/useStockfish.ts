import { useEffect, useRef, useState, useCallback } from 'react';
import { getAssetUrl } from '../lib/assets';

export interface EvalResult {
  cp?: number; // Centipawns from White's perspective (+ White, - Black)
  mate?: number; // Moves to mate from White's perspective
  bestMove?: string;
  depth?: number;
}

export function useStockfish() {
  const workerRef = useRef<Worker | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [currentEval, setCurrentEval] = useState<EvalResult>({ cp: 0 });
  const pendingFenRef = useRef<{ fen: string; turn: 'w' | 'b' } | null>(null);

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      const workerUrl = getAssetUrl('stockfish/stockfish.js');
      worker = new Worker(workerUrl);
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent) => {
        const line = typeof e.data === 'string' ? e.data : '';

        if (line === 'uciok' || line === 'readyok') {
          setIsReady(true);
        }

        if (line.startsWith('info') && line.includes('score')) {
          const matchCp = line.match(/score cp (-?\d+)/);
          const matchMate = line.match(/score mate (-?\d+)/);
          const matchDepth = line.match(/depth (\d+)/);

          const turn = pendingFenRef.current?.turn || 'w';
          let cp: number | undefined;
          let mate: number | undefined;

          if (matchCp) {
            const rawCp = parseInt(matchCp[1], 10);
            // Stockfish outputs score from active player perspective.
            // Convert to White's perspective:
            cp = turn === 'w' ? rawCp : -rawCp;
          }

          if (matchMate) {
            const rawMate = parseInt(matchMate[1], 10);
            mate = turn === 'w' ? rawMate : -rawMate;
          }

          const depth = matchDepth ? parseInt(matchDepth[1], 10) : undefined;

          setCurrentEval({
            cp,
            mate,
            depth,
          });
        }
      };

      worker.postMessage('uci');
      worker.postMessage('isready');
    } catch (err) {
      console.warn('Stockfish WASM could not be initialized:', err);
    }

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  const evaluatePosition = useCallback(
    (fen: string, turn: 'w' | 'b', depth = 10) => {
      if (!workerRef.current) return;
      pendingFenRef.current = { fen, turn };
      workerRef.current.postMessage('stop');
      workerRef.current.postMessage(`position fen ${fen}`);
      workerRef.current.postMessage(`go depth ${depth}`);
    },
    []
  );

  return {
    isReady,
    currentEval,
    evaluatePosition,
  };
}
