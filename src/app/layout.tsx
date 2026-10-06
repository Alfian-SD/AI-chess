import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '../i18n/LanguageContext';

export const metadata: Metadata = {
  title: 'AI Chess Arena - Let Them Play',
  description: 'Saksikan dua model kecerdasan buatan (AI) bertanding catur secara langsung dengan penalaran mendalam dan evaluasi real-time.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body style={{ backgroundColor: 'var(--bg)', minHeight: '100vh', margin: 0 }}>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
