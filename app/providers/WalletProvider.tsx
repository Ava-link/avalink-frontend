'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ethers } from 'ethers';

type WalletType = 'metamask' | 'core';

interface WalletContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  connectedWallet: WalletType | null;
  walletAddress: string;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  connect: (walletType?: WalletType) => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(true);
  const [connectedWallet, setConnectedWallet] = useState<WalletType | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  // Auto-reconnect on load
  useEffect(() => {
    const initialize = async () => {
      const anyWindow = window as unknown as {
        ethereum?: unknown;
        core?: unknown;
      };
      if (!anyWindow.ethereum && !anyWindow.core) return;
      try {
        const web3Provider = new ethers.BrowserProvider((anyWindow.core as ethers.Eip1193Provider) || (anyWindow.ethereum as ethers.Eip1193Provider));
        const accounts = await web3Provider.listAccounts();
        if (accounts.length > 0) {
          const resolvedSigner = await web3Provider.getSigner();
          const address = await resolvedSigner.getAddress();
          setProvider(web3Provider);
          setSigner(resolvedSigner);
          setWalletAddress(address);
          setConnectedWallet((anyWindow.core ? 'core' : 'metamask'));
        }
      } catch {
        // ignore
      }
    };
    initialize();
  }, []);

  const toggleDarkMode = () => setDarkMode((d) => !d);

  const connect = async (walletType: WalletType = 'metamask') => {
    const anyWindow = window as unknown as {
      ethereum?: ethers.Eip1193Provider;
      core?: ethers.Eip1193Provider;
    };
    let targetProvider: ethers.Eip1193Provider | undefined = undefined;
    if (walletType === 'core' && anyWindow.core) {
      targetProvider = anyWindow.core;
    } else if (anyWindow.ethereum) {
      targetProvider = anyWindow.ethereum;
    } else {
      throw new Error('No wallet found');
    }
    const web3Provider = new ethers.BrowserProvider(targetProvider);
    await web3Provider.send('eth_requestAccounts', []);
    const resolvedSigner = await web3Provider.getSigner();
    const address = await resolvedSigner.getAddress();
    setProvider(web3Provider);
    setSigner(resolvedSigner);
    setWalletAddress(address);
    setConnectedWallet(walletType === 'core' ? 'core' : 'metamask');
  };

  const disconnect = () => {
    setConnectedWallet(null);
    setWalletAddress('');
    setProvider(null);
    setSigner(null);
  };

  const value = useMemo<WalletContextValue>(() => ({
    darkMode,
    toggleDarkMode,
    connectedWallet,
    walletAddress,
    provider,
    signer,
    connect,
    disconnect,
  }), [darkMode, connectedWallet, walletAddress, provider, signer]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}


