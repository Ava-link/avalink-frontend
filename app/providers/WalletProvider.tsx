'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { AppKitProvider, useAppKit, useAppKitAccount, useAppKitProvider, useDisconnect } from '@reown/appkit/react';
import { Ethers5Adapter } from '@reown/appkit-adapter-ethers5';
import { avalanche, avalancheFuji } from '@reown/appkit/networks';
import { ethers } from 'ethers';

type WalletType = 'EXTERNAL' | 'WALLET_CONNECT' | 'INJECTED' | 'ANNOUNCED' | 'AUTH' | 'MULTI_CHAIN';

interface WalletContextValue {
  darkMode: boolean;
  toggleDarkMode: () => void;
  connectedWallet: WalletType | null;
  walletAddress: string;
  provider: ethers.providers.Web3Provider | null;
  signer: ethers.providers.JsonRpcSigner | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

const projectId = process.env.NEXT_PUBLIC_PROJECT_ID;

const metadata = {
  name: 'Avalink',
  description: 'Avalanche subnet bridge portal',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'https://avalink.app',
  icons: ['https://avatars.githubusercontent.com/u/37784886?s=200&v=4'],
};

const adapters = [new Ethers5Adapter()];
const networks = [avalancheFuji, avalanche] as [typeof avalancheFuji, typeof avalanche];

function WalletProviderInner({ children }: { children: React.ReactNode }) {
  const [darkMode, setDarkMode] = useState(true);
  const [connectedWallet, setConnectedWallet] = useState<WalletType | null>(null);
  const [walletAddress, setWalletAddress] = useState('');
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [signer, setSigner] = useState<ethers.providers.JsonRpcSigner | null>(null);

  const { open } = useAppKit();
  const { disconnect: disconnectAppKit } = useDisconnect();
  const { address, isConnected } = useAppKitAccount({ namespace: 'eip155' });
  const { walletProvider, walletProviderType } = useAppKitProvider<ethers.providers.ExternalProvider>('eip155');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  useEffect(() => {
    if (isConnected && walletProvider && address) {
      const web3Provider = new ethers.providers.Web3Provider(walletProvider, 'any');
      const signerInstance = web3Provider.getSigner();

      setProvider(web3Provider);
      setSigner(signerInstance);
      setWalletAddress(address);
      setConnectedWallet(walletProviderType ?? null);
      return;
    }

    setProvider(null);
    setSigner(null);
    setWalletAddress('');
    setConnectedWallet(null);
  }, [isConnected, walletProvider, address, walletProviderType]);

  const toggleDarkMode = useCallback(() => {
    setDarkMode((d) => !d);
  }, []);

  const connect = useCallback(async () => {
    await open({ view: 'Connect', namespace: 'eip155' });
  }, [open]);

  const disconnect = useCallback(async () => {
    await disconnectAppKit();
    setProvider(null);
    setSigner(null);
    setWalletAddress('');
    setConnectedWallet(null);
  }, [disconnectAppKit]);

  const value = useMemo<WalletContextValue>(() => ({
    darkMode,
    toggleDarkMode,
    connectedWallet,
    walletAddress,
    provider,
    signer,
    connect,
    disconnect,
  }), [darkMode, toggleDarkMode, connectedWallet, walletAddress, provider, signer, connect, disconnect]);

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export default function WalletProvider({ children }: { children: React.ReactNode }) {
  if (!projectId) {
    throw new Error('NEXT_PUBLIC_PROJECT_ID is required to initialize WalletConnect');
  }

  return (
    <AppKitProvider
      projectId={projectId}
      adapters={adapters}
      networks={networks}
      defaultNetwork={avalancheFuji}
      metadata={metadata}
      themeMode="dark"
    >
      <WalletProviderInner>
        {children}
      </WalletProviderInner>
    </AppKitProvider>
  );
}
