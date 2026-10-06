export interface OpeningLine {
  id: string;
  name: string;
  moves: string[]; // SAN notation moves in sequence
  eco?: string;
  description: string;
}

export const OPENING_BOOK: OpeningLine[] = [
  {
    id: 'italian',
    name: 'Italian Game',
    eco: 'C50',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4', 'Bc5'],
    description: 'Classical open game aiming for rapid piece development and f7 pressure.',
  },
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez',
    eco: 'C65',
    moves: ['e4', 'e5', 'Nf3', 'Nc6', 'Bb5', 'a6', 'Ba4', 'Nf6'],
    description: 'Spanish game pinning the c6 knight to exert long-term pressure on e5.',
  },
  {
    id: 'queens-gambit',
    name: 'Queen\'s Gambit',
    eco: 'D30',
    moves: ['d4', 'd5', 'c4', 'e6', 'Nc3', 'Nf6'],
    description: 'White offers the c-pawn to establish central dominance.',
  },
  {
    id: 'sicilian',
    name: 'Sicilian Defense',
    eco: 'B50',
    moves: ['e4', 'c5', 'Nf3', 'd6', 'd4', 'cxd4', 'Nxd4', 'Nf6'],
    description: 'Asymmetrical combat counter-attacking the center from the c-file.',
  },
  {
    id: 'french',
    name: 'French Defense',
    eco: 'C01',
    moves: ['e4', 'e6', 'd4', 'd5', 'Nc3', 'Nf6'],
    description: 'Solid pawn chain counterplay creating counterpressure on d4.',
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    eco: 'B18',
    moves: ['e4', 'c6', 'd4', 'd5', 'Nc3', 'dxe4', 'Nxe4', 'Bf5'],
    description: 'Resilient and positional opening preparing d5 without blocking the light-squared bishop.',
  },
  {
    id: 'english',
    name: 'English Opening',
    eco: 'A20',
    moves: ['c4', 'e5', 'Nc3', 'Nf6', 'Nf3', 'Nc6'],
    description: 'Flank opening fighting for control of the d5 square from the wing.',
  },
  {
    id: 'london',
    name: 'London System',
    eco: 'D02',
    moves: ['d4', 'd5', 'Bf4', 'Nf6', 'e3', 'c5', 'Nf3', 'Nc6'],
    description: 'Harmonious universal setup developing the dark-squared bishop early outside the pawn chain.',
  },
];

export function getRandomOpening(seed?: number): OpeningLine {
  if (seed !== undefined) {
    // Simple deterministic pseudo-random index
    const index = Math.abs(Math.floor(seed)) % OPENING_BOOK.length;
    return OPENING_BOOK[index];
  }
  const index = Math.floor(Math.random() * OPENING_BOOK.length);
  return OPENING_BOOK[index];
}
