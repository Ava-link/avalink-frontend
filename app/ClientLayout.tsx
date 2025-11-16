'use client';

import React from 'react';
import { Header } from '@/components/Header';
import { useWallet } from './providers/WalletProvider';
import { useRouter } from 'next/navigation';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { darkMode, toggleDarkMode, connectedWallet, walletAddress, disconnect, connect } = useWallet();
  const router = useRouter();
  return (
    <>
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        connectedWallet={!!connectedWallet}
        walletAddress={walletAddress}
        disconnectWallet={disconnect}
        onConnect={connect}
        onNavigateHome={() => router.push('/')}
        onNavigateBridge={() => router.push('/bridge')}
        onNavigateAddChain={() => router.push('/addchain')}
      />
      {children}
    </>
  );
}
