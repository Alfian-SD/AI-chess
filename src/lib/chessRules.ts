/**
 * Official Chess Rules Reference for AI Chess Arena.
 * CHESS_RULES is injected into every player model's system prompt (English).
 * CHESS_RULES_ID is localized for the interactive UI Help Panel (Indonesian).
 */

export const CHESS_RULES = `PIECE MOVEMENT
- Pawn: moves 1 square forward (2 squares from its starting rank). Captures 1 square diagonally forward. It cannot capture straight ahead.
- Rook: any number of squares horizontally or vertically, no jumping.
- Knight: an "L" shape (2 squares straight, then 1 sideways). The only piece that can jump over other pieces.
- Bishop: any number of squares diagonally, staying on its square color.
- Queen: any number of squares horizontally, vertically, or diagonally.
- King: 1 square in any direction, never onto an attacked square.

SPECIAL RULES
1. Castling: the king moves 2 squares toward a rook and that rook jumps to the other side of the king. Allowed only if the king and that rook have never moved, the squares between them are empty, the king is not in check, and the king does not pass through or land on an attacked square.
2. Pawn promotion: a pawn that reaches the last rank must become a queen, rook, bishop, or knight (written like e8=Q).
3. En passant: if an enemy pawn advances 2 squares and lands right beside your pawn, you may capture it diagonally as if it had moved only 1 square. This is possible ONLY on the very next move.

GAME END
- Check: the king is attacked and the position must be fixed this move by moving the king, blocking, or capturing the attacker.
- Checkmate: in check with no legal way out. The game ends.
- Draw: stalemate (no legal moves but not in check), insufficient material, threefold repetition, or the fifty-move rule.`;

export const CHESS_RULES_ID = `PERGERAKAN PION & BIDAK
- Pion: melangkah 1 petak maju (2 petak dari posisi awal). Memakan 1 petak diagonal maju. Tidak dapat memakan lurus ke depan.
- Benteng: bergerak sejumlah petak secara horizontal atau vertikal, tidak dapat melompati bidak lain.
- Kuda: berbentuk huruf "L" (2 petak lurus, lalu 1 ke samping). Satu-satunya bidak yang dapat melompati bidak lain.
- Gajah: bergerak sejumlah petak secara diagonal, selalu berada pada warna petak asalnya.
- Menteri (Ratu): bergerak sejumlah petak secara horizontal, vertikal, maupun diagonal.
- Raja: melangkah 1 petak ke segala arah, tidak boleh melangkah ke petak yang sedang diserang.

ATURAN KHUSUS
1. Rokade: raja melangkah 2 petak ke arah benteng dan benteng tersebut melompat ke sisi lain raja. Hanya diperbolehkan jika raja dan benteng tersebut belum pernah melangkah, petak di antara keduanya kosong, raja tidak sedang diskak, serta raja tidak melintasi atau mendarat di petak yang sedang diserang.
2. Promosi pion: pion yang mencapai baris terakhir harus berubah menjadi menteri, benteng, gajah, atau kuda (ditulis seperti e8=Q).
3. En passant: jika pion lawan melangkah maju 2 petak dan mendarat tepat di samping pion Anda, Anda dapat memakannya secara diagonal seolah-olah pion lawan hanya melangkah 1 petak. Ini HANYA dapat dilakukan tepat pada langkah berikutnya.

AKHIR PERMAINAN
- Skak: raja sedang diserang dan posisi harus diatasi pada langkah ini dengan melangkahkan raja, memblokir serangan, atau memakan bidak penyerang.
- Skakmat: dalam posisi skak tanpa langkah legal untuk keluar. Permainan berakhir.
- Remis (Draw): pat / stalemate (tidak ada langkah legal tetapi tidak sedang diskak), materi tidak cukup, pengulangan tiga kali (threefold repetition), atau aturan 50 langkah.`;
