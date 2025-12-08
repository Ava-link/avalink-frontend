'use client';

import React, { useEffect, useState } from 'react';
import { Orbitron } from "next/font/google";
import { cn } from "@/lib/utils";
import { useWallet } from "@/app/providers/WalletProvider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X } from 'lucide-react';

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400","700"] });

interface ChainInfo {
  id: string;
  name: string;
  chainId: string;
  rpcUrl?: string;
  blockchainId?: string;
  teleporterRegistryAddress?: string;
  isTestnet?: boolean;
  hasIcmEnabled?: boolean;
  logoUrl?: string;
  nativeTokenName?: string;
  nativeTokenSymbol?: string;
}

interface TokenOption {
  label: string;
  address: string;
}

// Token mappings based on chain name
const getTokenOptionsForChain = (chainName: string): TokenOption[] => {
  const normalizedName = chainName.toLowerCase();
  
  // Check in order of specificity
  if (normalizedName.includes('c-chain')) {
    return [
      { label: 'Mock Token (C Chain)', address: '0x9dafF7B0c496591CC20Af1D8394FF1cB8696c9a7' }
    ];
  } else if (normalizedName.includes('echo')) {
    return [
      { label: 'TE (Echo)', address: '0xB536eF3D95b86eFBba652DB5E31dF2E47807a743' }
    ];
  } else if (normalizedName.includes('dispatch')) {
    return [
      { label: 'Mock Token (Dispatch)', address: '0x0D53Fab0E10C8b3C6074F76f394e2eD8B22c8b02' }
    ];
  }
  
  return [];
};

export default function FaucetPage() {
  const { darkMode, connectedWallet, walletAddress, connect } = useWallet();
  const [availableChains, setAvailableChains] = useState<ChainInfo[]>([]);
  const [selectedChainId, setSelectedChainId] = useState<string>('');
  const [selectedTokenAddress, setSelectedTokenAddress] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');
  const [successData, setSuccessData] = useState<{
    txHash?: string;
    recipient?: string;
    amount?: number;
  } | null>(null);
  const [chainsLoading, setChainsLoading] = useState(false);
  const [chainsError, setChainsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChains = async () => {
      setChainsLoading(true);
      setChainsError(null);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
        const response = await fetch(`${backendUrl}/deploy/chains`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch chains (status ${response.status})`);
        }

        const data = await response.json();
        if (Array.isArray(data?.chain)) {
          // Filter to only show: Avalanche (C-Chain), Dispatch L1, Echo L1
          const filteredChains = data.chain.filter((chain: ChainInfo) => {
            const chainNameLower = chain.name.toLowerCase();
            return (
              (chainNameLower.includes('avalanche') && chainNameLower.includes('c-chain')) ||
              (chainNameLower.includes('dispatch') && chainNameLower.includes('l1')) ||
              (chainNameLower.includes('echo') && chainNameLower.includes('l1'))
            );
          });
          
          setAvailableChains(filteredChains);
          if (filteredChains.length > 0) {
            setSelectedChainId(filteredChains[0].id);
            // Set initial token address based on first chain
            const initialTokens = getTokenOptionsForChain(filteredChains[0].name);
            if (initialTokens.length > 0) {
              setSelectedTokenAddress(initialTokens[0].address);
            }
          }
        } else {
          throw new Error('Unexpected response while fetching chains');
        }
      } catch (error) {
        console.error('Error fetching chains:', error);
        setChainsError(error instanceof Error ? error.message : 'Unable to load chains');
      } finally {
        setChainsLoading(false);
      }
    };

    fetchChains();
  }, []);

  const selectedChain = availableChains.find(chain => chain.id === selectedChainId);
  const availableTokens = selectedChain ? getTokenOptionsForChain(selectedChain.name) : [];

  // Update token address when chain changes
  useEffect(() => {
    if (selectedChain && availableTokens.length > 0) {
      setSelectedTokenAddress(availableTokens[0].address);
    } else {
      setSelectedTokenAddress('');
    }
  }, [selectedChainId, selectedChain, availableTokens]);

  const handleCollectTokens = async () => {
    if (!connectedWallet || !walletAddress) {
      setToastType('error');
      setToastMessage('Please connect your wallet first');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    if (!selectedChain) {
      setToastType('error');
      setToastMessage('Please select a chain');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    if (!selectedChain.rpcUrl) {
      setToastType('error');
      setToastMessage('Selected chain does not have an RPC URL');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    if (!selectedTokenAddress || !selectedTokenAddress.trim()) {
      setToastType('error');
      setToastMessage('Please select a token');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    setIsSubmitting(true);
    setSuccessData(null);

    try {
      const faucetUrl = process.env.NEXT_PUBLIC_FAUCET_URL || 'http://localhost:3002';
      const response = await fetch(`${faucetUrl}/faucet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          walletAddress: walletAddress,
          tokenAddress: selectedTokenAddress.trim(),
          rpcUrl: selectedChain.rpcUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || `HTTP error! status: ${response.status}`);
      }

      if (data.status === 'success') {
        setToastType('success');
        setToastMessage(data.message || 'Successfully collected tokens!');
        setSuccessData(data.data || null);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      } else {
        throw new Error(data.message || 'Failed to collect tokens');
      }
    } catch (error) {
      console.error('Error collecting tokens:', error);
      setToastType('error');
      setToastMessage(error instanceof Error ? error.message : 'Error collecting tokens. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main
      className={cn(
        "min-h-screen w-full p-2 md:p-4",
        orbitron.className,
        darkMode ? "bg-[#0E0E0E] text-white" : "bg-[#f2f2f2] text-black"
      )}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        
        {/* PAGE TITLE BLOCK */}
        <section
          className={cn(
            "col-span-1 sm:col-span-2 lg:col-span-4 border p-6",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          <h1 className="text-4xl md:text-5xl font-bold tracking-wide mb-2">
            FAUCET
          </h1>
          <p className={cn("text-sm tracking-widest", darkMode ? 'text-gray-400' : 'text-gray-600')}>
            GET TEST TOKENS FOR TESTING THE BRIDGE
          </p>
        </section>

        {/* MAIN FAUCET SECTION */}
        <section
          className={cn(
            "col-span-1 sm:col-span-2 lg:col-span-4 border p-6",
            darkMode ? "border-gray-700" : "border-black"
          )}
        >
          {!connectedWallet ? (
            <div className="space-y-4">
              <p className={cn("text-sm tracking-widest", darkMode ? 'text-gray-400' : 'text-gray-600')}>
                GET 2 TOKENS CANNOT BE TAKEN
              </p>
              <button
                onClick={connect}
                className={cn(
                  "cursor-target px-6 py-3 border transition-colors",
                  darkMode 
                    ? "border-gray-700 bg-[#202020] hover:bg-gray-700 text-white" 
                    : "border-black bg-white hover:bg-gray-200 text-black"
                )}
              >
                CONNECT WALLET
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <p className={cn("text-xs tracking-widest mb-2", darkMode ? 'text-gray-400' : 'text-gray-600')}>
                  WALLET ADDRESS
                </p>
                <div className={cn(
                  "px-4 py-3 border font-mono text-sm break-all",
                  darkMode ? "border-gray-700 bg-gray-800/50 text-white" : "border-black bg-white text-black"
                )}>
                  {walletAddress}
                </div>
              </div>

              <div>
                <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                  SELECT CHAIN *
                </label>
                <Select
                  value={selectedChainId}
                  onValueChange={setSelectedChainId}
                  disabled={chainsLoading}
                >
                  <SelectTrigger
                    className={cn("cursor-target w-full border rounded-none tracking-wide", darkMode ? 'bg-[#0e0e0e]/60 border-gray-700 text-white' : 'bg-white border-black text-gray-900')}
                  >
                    <SelectValue placeholder={chainsLoading ? 'LOADING CHAINS...' : 'SELECT A CHAIN'} />
                  </SelectTrigger>
                  <SelectContent className={cn("cursor-target rounded-none border", darkMode ? 'bg-[#0e0e0e] text-white border-gray-700' : 'bg-white text-gray-900 border-black')}>
                    {availableChains.map(chain => (
                      <SelectItem key={chain.id} value={chain.id}>
                        <div className="flex items-center gap-3">
                          {chain.logoUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={chain.logoUrl}
                              alt={chain.name}
                              className="h-5 w-5 rounded-full object-contain"
                            />
                          )}
                          <span className="tracking-wide">{chain.name.toUpperCase()}</span>
                          {chain.isTestnet && (
                            <span className="ml-auto text-xs uppercase tracking-wide text-red-500">
                              FUJI
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {chainsError && (
                  <p className="mt-2 text-xs tracking-widest text-red-500">
                    {chainsError}
                  </p>
                )}
              </div>

              {/* Token Dropdown and Button - Side by side on large screens, stacked on mobile */}
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
                <div className="flex-1 w-full md:w-auto">
                  <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    SELECT TOKEN *
                  </label>
                  <Select
                    value={selectedTokenAddress}
                    onValueChange={setSelectedTokenAddress}
                    disabled={!selectedChain || availableTokens.length === 0}
                  >
                    <SelectTrigger
                      className={cn("cursor-target w-full md:w-[280px] border rounded-none tracking-wide", darkMode ? 'bg-[#0e0e0e]/60 border-gray-700 text-white' : 'bg-white border-black text-gray-900')}
                    >
                      <SelectValue placeholder={!selectedChain ? 'SELECT A CHAIN FIRST' : availableTokens.length === 0 ? 'NO TOKENS AVAILABLE' : 'SELECT A TOKEN'} />
                    </SelectTrigger>
                    <SelectContent className={cn("cursor-target rounded-none border", darkMode ? 'bg-[#0e0e0e] text-white border-gray-700' : 'bg-white text-gray-900 border-black')}>
                      {availableTokens.map((token) => (
                        <SelectItem key={token.address} value={token.address}>
                          <div className="flex flex-col">
                            <span className="tracking-wide">{token.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <button
                  onClick={handleCollectTokens}
                  disabled={isSubmitting || !selectedChain || !selectedTokenAddress.trim() || !selectedChain.rpcUrl}
                  className={cn(
                    "cursor-target px-8 py-3 border rounded-none font-semibold tracking-widest transition-all w-full md:w-auto",
                    (isSubmitting || !selectedChain || !selectedTokenAddress.trim() || !selectedChain.rpcUrl)
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer',
                    darkMode 
                      ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-700/30' 
                      : 'bg-red-200 hover:bg-red-300 text-red-600 border-red-300'
                  )}
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      COLLECTING...
                    </span>
                  ) : (
                    'COLLECT TOKENS'
                  )}
                </button>
              </div>

              {/* Success Message */}
              {successData && (
                <div className={cn(
                  "border p-4 space-y-2",
                  darkMode ? "border-green-700 bg-green-900/20" : "border-green-300 bg-green-50"
                )}>
                  <p className={cn("text-sm font-bold tracking-widest", darkMode ? 'text-green-400' : 'text-green-700')}>
                    ✓ SUCCESS
                  </p>
                  {successData.amount && (
                    <p className={cn("text-xs tracking-widest", darkMode ? 'text-green-300' : 'text-green-600')}>
                      Amount: {successData.amount} tokens
                    </p>
                  )}
                  {successData.recipient && (
                    <p className={cn("text-xs tracking-widest font-mono break-all", darkMode ? 'text-green-300' : 'text-green-600')}>
                      Recipient: {successData.recipient}
                    </p>
                  )}
                  {successData.txHash && (
                    <p className={cn("text-xs tracking-widest font-mono break-all", darkMode ? 'text-green-300' : 'text-green-600')}>
                      TX Hash: {successData.txHash}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>

      </div>

      {/* Toast Notification */}
      {showToast && (
        <div className={cn(
          "fixed bottom-4 right-4 px-6 py-3 shadow-lg z-50 flex items-center gap-2 border",
          toastType === 'success'
            ? darkMode 
              ? 'bg-green-900/90 text-green-200 border-green-700' 
              : 'bg-green-50 text-green-800 border-green-300'
            : darkMode 
              ? 'bg-red-900/90 text-red-200 border-red-700' 
              : 'bg-red-50 text-red-800 border-red-300'
        )}>
          <span>{toastMessage}</span>
          <button onClick={() => setShowToast(false)} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </main>
  );
}

