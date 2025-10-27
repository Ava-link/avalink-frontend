'use client';

import React from 'react';
import Header from '@/components/Header';
import { useWallet } from './providers/WalletProvider';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export default function ClientLayout({ children }: ClientLayoutProps) {
  const { darkMode, toggleDarkMode, connectedWallet, walletAddress, disconnect, connect } = useWallet();

  return (
    <>
      <Header
        darkMode={darkMode}
        toggleDarkMode={toggleDarkMode}
        connectedWallet={!!connectedWallet}
        walletAddress={walletAddress}
        disconnectWallet={disconnect}
        setShowWalletModal={() => connect().catch(() => {})}
      />
      {children}
    </>
  );
}
