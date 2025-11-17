import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@/styles/css/computer.css";
import WalletProvider from './providers/WalletProvider';
import ClientLayout from './ClientLayout';
import TargetCursor from '@/components/TargetCursor';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Avalink",
  description: "Avalanche subnet bridge portal",
  icons: {
    icon: "/avalinktempNoBG.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
      <TargetCursor 
        spinDuration={2.75}
        hideDefaultCursor={true}
        parallaxOn={false}
      />
        <WalletProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </WalletProvider>
      </body>
    </html>
  );
}
