import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Click the Button!',
  description: 'Click-the-button game with Supabase auth',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
