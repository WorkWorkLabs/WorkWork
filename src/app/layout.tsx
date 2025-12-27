import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { TRPCProvider } from '@/trpc/provider';
import { ParticleAuthWrapper } from '@/components/auth/particle-provider';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});
const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'WorkWork Ledger',
  description: 'Lightweight income management for freelancers',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <TRPCProvider>
          <ParticleAuthWrapper>{children}</ParticleAuthWrapper>
        </TRPCProvider>
      </body>
    </html>
  );
}
