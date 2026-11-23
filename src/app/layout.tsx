import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FarmIQ — Sunflower Land Profit Intelligence Hub',
  description: 'Your farm. Your market. Your next profitable move. Automated profit recommendations, opportunity cost analysis, and personalized farm missions for Sunflower Land.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0f0d0a] text-[#f4eee0] antialiased selection:bg-amber-500 selection:text-stone-950">
        {children}
      </body>
    </html>
  );
}

