'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { useWallet } from './providers/WalletProvider';
import { ethers } from 'ethers';
import ERC20TokenHomeABI from '../abi/ERC20TokenHome.json';
import TeleporterMessengerABI from '../abi/TeleporterMessenger.json';
import Image from 'next/image';
import { MultiStepLoader as Loader } from '@/components/ui/multi-step-loader';

// API Types
interface Chain {
  id: string;
  name: string;
  chainId: string;
  isTestnet: boolean;
  explorerUrl: string;
  logoUrl: string;
  nativeTokenName: string;
  nativeTokenSymbol: string;
  hasIcmEnabled: boolean;
  rpcUrl?: string;
}

interface ICTTChain {
  name: string;
  isTestnet: boolean;
  logoUrl: string;
  teleporterAddress: string;
  teleporterRegistryAddress: string;
  hasIcmEnabled: boolean;
  explorerUrl: string;
  nativeTokenName: string;
  nativeTokenSymbol: string;
  blockchainId: string;
  rpcUrl?: string;
}

interface TokenInfo {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  address: string;
  logoUrl: string | null;
}

interface ICTTSetup {
  id: string;
  setupName: string;
  tokenHomeAddress: string;
  tokenRemoteAddress: string;
  tokenHomeChainId: string;
  tokenRemoteChainId: string;
  tokenHomeChain: ICTTChain;
  tokenRemoteChain: ICTTChain;
  sendToken: TokenInfo;
  receiveToken: TokenInfo;
}

interface ChainOption {
  id: string;
  name: string;
  symbol: string;
  logoUrl: string;
  color: string;
  chainId?: string;
  blockchainId?: string;
  tokenAddress?: string;
  tokenRemoteAddress?: string;
  tokenHomeAddress?: string;
  rpcUrl?: string;
  icttSetupId?: string;
}

interface TokenOption {
  symbol: string;
  name: string;
  address: string;
  color: string;
  decimals?: number;
  remoteAddress?: string;
  bridgeContractAddress?: string;
  icttSetupId?: string;
  isHomeChainToken?: boolean;
}

const DEFAULT_BRIDGE_LOADING_STATES = [
  { text: 'Bridge transaction initiated' },
  { text: 'Token allowance checked' },
  { text: 'Bridge transaction submitted' },
  { text: 'Bridge transaction confirmed' },
];

const cloneBridgeLoaderStates = () =>
  DEFAULT_BRIDGE_LOADING_STATES.map((state) => ({ ...state }));

const shortenHash = (hash: string) =>
  hash.length <= 10 ? hash : `${hash.slice(0, 6)}...${hash.slice(-4)}`;

const isUserRejectedRequest = (error: unknown): boolean => {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const possibleCode = (error as { code?: number | string }).code;
  const normalizedCode =
    typeof possibleCode === 'string' ? possibleCode.toLowerCase() : possibleCode;

  if (
    normalizedCode === 4001 ||
    normalizedCode === '4001' ||
    normalizedCode === 'action_rejected'
  ) {
    return true;
  }

  const message = (error as { message?: string }).message ?? '';
  return typeof message === 'string' && message.toLowerCase().includes('user rejected');
};

const MAX_TRANSFER_AMOUNT = 1_000_000;

export default function AvalinkMain() {
  const { darkMode, connectedWallet, connect, provider, signer, walletAddress } = useWallet();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<TokenOption | null>(null);
  const [fromChain, setFromChain] = useState<ChainOption | null>(null);
  const [toChain, setToChain] = useState<ChainOption | null>(null);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [bridgeLoaderOpen, setBridgeLoaderOpen] = useState(false);
  const [bridgeLoaderStep, setBridgeLoaderStep] = useState(0);
  const [bridgeLoaderStates, setBridgeLoaderStates] = useState(cloneBridgeLoaderStates);
  
  // API data states
  const [availableChains, setAvailableChains] = useState<ChainOption[]>([]);
  const [availableToChains, setAvailableToChains] = useState<ChainOption[]>([]);
  const [availableTokens, setAvailableTokens] = useState<TokenOption[]>([]);
  const [loadingChains, setLoadingChains] = useState(true);
  const [loadingToChains, setLoadingToChains] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [icttSetups, setIcttSetups] = useState<ICTTSetup[]>([]);
  const [activeIcttSetup, setActiveIcttSetup] = useState<ICTTSetup | null>(null);

  const [localError, setLocalError] = useState('');
  const [criticalError, setCriticalError] = useState<Error | null>(null);
  const [isProcessingSend, setIsProcessingSend] = useState(false);
  const [lastApprovalTxId, setLastApprovalTxId] = useState<string | undefined>(undefined);
  const [lastSendTxId, setLastSendTxId] = useState<string | undefined>(undefined);
  const [lastSendTxDetails, setLastSendTxDetails] = useState<{ source?: { initiatedAt?: number; confirmedAt?: number } } | null>(null);
  const [messageID, setMessageID] = useState<string | null>(null);
  const [tryCount, setTryCount] = useState(0);
  const [tokenAllowance, setTokenAllowance] = useState<bigint | null>(null);
  const [tokenBalance, setTokenBalance] = useState<bigint | null>(null);
  const [tokenDecimals, setTokenDecimals] = useState<number | null>(null);
  const [requiredGasLimit, setRequiredGasLimit] = useState<string>('250000');
  const bridgeLoaderStepRef = useRef(0);

  useEffect(() => {
    bridgeLoaderStepRef.current = bridgeLoaderStep;
  }, [bridgeLoaderStep]);

  const resetBridgeLoader = useCallback(() => {
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
      loaderTimeoutRef.current = null;
    }
    setBridgeLoaderOpen(false);
    setBridgeLoaderStep(0);
    setBridgeLoaderStates(cloneBridgeLoaderStates());
  }, []);

  const updateLoaderState = useCallback((index: number, text: string) => {
    setBridgeLoaderStates((prev) =>
      prev.map((state, idx) => (idx === index ? { text } : state))
    );
  }, []);

  const loaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scheduleLoaderReset = useCallback(
    (delay: number) => {
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current);
      }
      loaderTimeoutRef.current = setTimeout(() => {
        resetBridgeLoader();
        loaderTimeoutRef.current = null;
      }, delay);
    },
    [resetBridgeLoader]
  );

  useEffect(() => {
    return () => {
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current);
      }
    };
  }, []);
  
  // Refs to track previous values and prevent infinite loops
  const prevTokenAddressRef = useRef<string | null>(null);
  const prevToChainIdRef = useRef<string | null>(null);
  const isUpdatingTokenRef = useRef(false);
  const prevFromChainIdRef = useRef<string | null>(null);
  const isUpdatingFromChainRef = useRef(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

  const loadTokenInfo = useCallback(async () => {
    if (!fromToken || !fromToken.bridgeContractAddress || !signer || !walletAddress) {
      setTokenAllowance(null);
      setTokenBalance(null);
      return null;
    }

    try {
      const tokenContract = new ethers.Contract(
        fromToken.address,
        [
          'function allowance(address owner, address spender) external view returns (uint256)',
          'function balanceOf(address account) external view returns (uint256)',
          'function decimals() external view returns (uint8)',
        ],
        signer
      );

      const [decimalsRaw, allowanceRaw, balanceRaw] = await Promise.all([
        fromToken.decimals !== undefined ? Promise.resolve(fromToken.decimals) : tokenContract.decimals(),
        tokenContract.allowance(walletAddress, fromToken.bridgeContractAddress),
        tokenContract.balanceOf(walletAddress),
      ]);

      const decimalsValue = Number(decimalsRaw);
      setTokenDecimals(decimalsValue);
      setTokenAllowance(allowanceRaw);
      setTokenBalance(balanceRaw);

      return {
        decimals: decimalsValue,
        allowance: allowanceRaw,
        balance: balanceRaw,
      };
    } catch (error) {
      console.error('Error loading token info:', error);
      setTokenAllowance(null);
      setTokenBalance(null);
      setTokenDecimals(null);
      return null;
    }
  }, [fromToken, signer, walletAddress]);

  useEffect(() => {
    if (!connectedWallet) {
      setTokenAllowance(null);
      setTokenBalance(null);
      setTokenDecimals(null);
      return;
    }

    loadTokenInfo();
  }, [connectedWallet, loadTokenInfo]);

  // Helper function to generate color gradient from chain name
  const getColorFromName = (name: string): string => {
    const colors = [
      'from-purple-400 to-purple-600',
      'from-blue-400 to-blue-600',
      'from-green-400 to-green-600',
      'from-orange-400 to-orange-600',
      'from-red-400 to-red-600',
      'from-pink-400 to-pink-600',
      'from-indigo-400 to-indigo-600',
      'from-teal-400 to-teal-600',
    ];
    const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[hash % colors.length];
  };


  // Fetch all available chains
  useEffect(() => {
    const fetchChains = async () => {
      try {
        setLoadingChains(true);
        const response = await fetch(`${backendUrl}/available/chains`);
        const data = await response.json();
        
        if (data.success && data.chains) {
          const chains: ChainOption[] = data.chains.map((chain: Chain) => ({
            id: chain.id,
            name: chain.name,
            symbol: chain.nativeTokenSymbol,
            logoUrl: chain.logoUrl,
            color: getColorFromName(chain.name),
            chainId: chain.chainId,
            rpcUrl: chain.explorerUrl,
          }));
          
          setAvailableChains(chains);
          if (chains.length > 0 && !fromChain) {
            setFromChain(chains[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching chains:', error);
        setLocalError('Failed to load chains. Please try again.');
      } finally {
        setLoadingChains(false);
      }
    };

    fetchChains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendUrl]);

  // Fetch available tokens when "from chain" is selected
  useEffect(() => {
    // Skip if we're in the middle of updating fromChain (to prevent loops)
    if (isUpdatingFromChainRef.current) {
      return;
    }

    const currentChainId = fromChain?.id || null;
    
    // Skip if chain ID hasn't changed
    if (currentChainId === prevFromChainIdRef.current) {
      return;
    }

    const fetchTokens = async () => {
      if (!fromChain) {
        setAvailableTokens([]);
        setIcttSetups([]);
        setFromToken(null);
        setAvailableToChains([]);
        setToChain(null);
        prevFromChainIdRef.current = null;
        return;
      }

      const sourceChainId = fromChain.id;

      try {
        setLoadingTokens(true);
        const response = await fetch(`${backendUrl}/available/ictt/${fromChain.id}`);
        const data = await response.json();
        console.log('Data fetched from /available/ictt/:id:', data);
        if (data.success && data.icttSetup) {
          // Store all ICTT setups for later filtering
          setIcttSetups(data.icttSetup);
          
          // Sync latest metadata for the currently selected source chain
          if (fromChain && data.icttSetup.length > 0) {
            const matchingSetupForChain = data.icttSetup.find(
              (setup: ICTTSetup) =>
                setup.tokenHomeChainId === sourceChainId ||
                setup.tokenRemoteChainId === sourceChainId
            );

            if (matchingSetupForChain) {
              const isHomeChainMatch = matchingSetupForChain.tokenHomeChainId === sourceChainId;
              const matchedChainInfo = isHomeChainMatch
                ? matchingSetupForChain.tokenHomeChain
                : matchingSetupForChain.tokenRemoteChain;

              const derivedRpcUrl = getRpcUrlForChain(matchedChainInfo);
              const derivedChainId = getChainIdForChain(matchedChainInfo);

              isUpdatingFromChainRef.current = true;

              setFromChain((prevChain) => {
                if (!prevChain) {
                  isUpdatingFromChainRef.current = false;
                  return prevChain;
                }

                const updatedChain = {
                  ...prevChain,
                  name: matchedChainInfo.name || prevChain.name,
                  symbol: matchedChainInfo.nativeTokenSymbol || prevChain.symbol,
                  logoUrl: matchedChainInfo.logoUrl || prevChain.logoUrl,
                  blockchainId: matchedChainInfo.blockchainId || prevChain.blockchainId,
                  rpcUrl: derivedRpcUrl || prevChain.rpcUrl,
                  chainId: derivedChainId || prevChain.chainId,
                  color: matchedChainInfo.name ? getColorFromName(matchedChainInfo.name) : prevChain.color,
                };

                const fieldsToCheck: (keyof ChainOption)[] = [
                  'name',
                  'symbol',
                  'logoUrl',
                  'blockchainId',
                  'rpcUrl',
                  'chainId',
                  'color',
                ];

                const needsUpdate = fieldsToCheck.some(
                  (field) => updatedChain[field] !== prevChain[field]
                );

                if (!needsUpdate) {
                  isUpdatingFromChainRef.current = false;
                  return prevChain;
                }

                setTimeout(() => {
                  isUpdatingFromChainRef.current = false;
                }, 0);

                return updatedChain;
              });
            } else {
              isUpdatingFromChainRef.current = false;
            }
          }
          
          // Extract unique tokens from sendToken
          const tokenMap = new Map<string, TokenOption>();
          
          data.icttSetup.forEach((setup: ICTTSetup) => {
            if (!setup.sendToken) {
              return;
            }
            const isHomeChainContext = setup.tokenHomeChainId === sourceChainId;
            const bridgeContractAddress = isHomeChainContext ? setup.tokenHomeAddress : setup.tokenRemoteAddress;
            const counterpartTokenAddress = isHomeChainContext ? setup.tokenRemoteAddress : setup.tokenHomeAddress;
            const tokenKey = setup.sendToken.address.toLowerCase();
            if (!tokenMap.has(tokenKey)) {
              tokenMap.set(tokenKey, {
                symbol: setup.sendToken.symbol,
                name: setup.sendToken.name,
                address: setup.sendToken.address,
                color: getColorFromName(setup.sendToken.name),
                decimals: setup.sendToken.decimals,
                icttSetupId: setup.id,
                bridgeContractAddress,
                remoteAddress: counterpartTokenAddress,
                isHomeChainToken: isHomeChainContext,
              });
            }
          });
          
          const uniqueTokens = Array.from(tokenMap.values());
          setAvailableTokens(uniqueTokens);
          
          // Reset token and destination chain when source chain changes
          setFromToken(null);
          setAvailableToChains([]);
          setToChain(null);
          setActiveIcttSetup(null);
          // Reset refs
          prevTokenAddressRef.current = null;
          prevToChainIdRef.current = null;
          isUpdatingTokenRef.current = false;
          
          // Update ref after processing
          prevFromChainIdRef.current = currentChainId;
        } else {
          setAvailableTokens([]);
          setIcttSetups([]);
          setFromToken(null);
          setAvailableToChains([]);
          setToChain(null);
        setActiveIcttSetup(null);
          prevFromChainIdRef.current = null;
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setLocalError('Failed to load available tokens. Please try again.');
        setAvailableTokens([]);
        setIcttSetups([]);
        setFromToken(null);
        setAvailableToChains([]);
        setToChain(null);
        setActiveIcttSetup(null);
        prevFromChainIdRef.current = null;
      } finally {
        setLoadingTokens(false);
      }
    };

    fetchTokens();
    // Use chain ID instead of whole object to prevent loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromChain?.id, backendUrl]);

  // Fetch available "to chains" when token is selected
  useEffect(() => {
    // Skip if we're in the middle of updating token (to prevent loops)
    if (isUpdatingTokenRef.current) {
      return;
    }

    const currentTokenAddress = fromToken?.address?.toLowerCase() || null;
    
    // Skip if token address hasn't changed
    if (currentTokenAddress === prevTokenAddressRef.current) {
      return;
    }

    const fetchToChains = async () => {
      if (!fromChain || !fromToken || icttSetups.length === 0) {
        setAvailableToChains([]);
        setToChain(null);
        setActiveIcttSetup(null);
        prevTokenAddressRef.current = null;
        return;
      }

      try {
        setLoadingToChains(true);
        
        // Filter ICTT setups that match the selected token
        const sourceChainId = fromChain?.id || null;
        const matchingSetups = icttSetups.filter((setup: ICTTSetup) => {
          if (!setup.sendToken) {
            return false;
          }
          const matchesToken = setup.sendToken.address.toLowerCase() === fromToken.address.toLowerCase();
          const matchesSource =
            sourceChainId === null ||
            setup.tokenHomeChainId === sourceChainId ||
            setup.tokenRemoteChainId === sourceChainId;
          return matchesToken && matchesSource;
        });
        
        const toChains: ChainOption[] = [];
        
        matchingSetups.forEach((setup: ICTTSetup) => {
          if (!sourceChainId) {
            return;
          }
          const isHomeChainContext = setup.tokenHomeChainId === sourceChainId;
          const destinationChain = isHomeChainContext ? setup.tokenRemoteChain : setup.tokenHomeChain;
          const destinationBlockchainId = destinationChain.blockchainId;
          if (!destinationBlockchainId) {
            return;
          }
          const derivedRpcUrl = getRpcUrlForChain(destinationChain);
          const destinationTokenAddress = isHomeChainContext ? setup.tokenRemoteAddress : setup.tokenHomeAddress;
          const originBridgeAddress = isHomeChainContext ? setup.tokenHomeAddress : setup.tokenRemoteAddress;
          toChains.push({
            id: destinationBlockchainId,
            name: destinationChain.name,
            symbol: destinationChain.nativeTokenSymbol,
            logoUrl: destinationChain.logoUrl,
            color: getColorFromName(destinationChain.name),
            blockchainId: destinationBlockchainId,
            tokenRemoteAddress: destinationTokenAddress,
            tokenHomeAddress: originBridgeAddress,
            icttSetupId: setup.id,
            rpcUrl: derivedRpcUrl,
          });
        });
        
        // Remove duplicates based on blockchainId
        const uniqueToChains = Array.from(
          new Map(toChains.map(chain => [chain.blockchainId, chain])).values()
        );
        
        setAvailableToChains(uniqueToChains);
        
        // Set default to chain if available, but only if it's different from current
        if (uniqueToChains.length > 0) {
          setToChain((prevChain) => {
            // Only update if the chain is different or doesn't exist
            if (!prevChain || prevChain.blockchainId !== uniqueToChains[0].blockchainId) {
              prevToChainIdRef.current = uniqueToChains[0].blockchainId || null;
              return uniqueToChains[0];
            }
            return prevChain;
          });
        } else {
          setToChain(null);
          setActiveIcttSetup(null);
          prevToChainIdRef.current = null;
        }

        // Update ref after processing
        prevTokenAddressRef.current = currentTokenAddress;
    } catch (error) {
      console.error('Error fetching destination chains:', error);
      setLocalError('Failed to load available destination chains. Please try again.');
        setAvailableToChains([]);
        setToChain(null);
        prevTokenAddressRef.current = null;
      } finally {
        setLoadingToChains(false);
      }
    };

    fetchToChains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken?.address, icttSetups.length, fromChain?.id]);

  // Update token's bridge contract and remote address when destination chain is selected
  useEffect(() => {
    if (!fromToken || !toChain || icttSetups.length === 0) {
      return;
    }

    const currentToChainId = toChain.blockchainId || null;
    
    // Skip if toChain blockchainId hasn't changed
    if (currentToChainId === prevToChainIdRef.current) {
      return;
    }

    // Find the ICTT setup that matches both token and destination chain
    const sourceChainId = fromChain?.id || null;
    const matchingSetup = icttSetups.find((setup: ICTTSetup) => {
      if (!setup.sendToken) {
        return false;
      }
      if (!sourceChainId) {
        return false;
      }
      const isHomeChainContext = setup.tokenHomeChainId === sourceChainId;
      const destinationBlockchainId = isHomeChainContext
        ? setup.tokenRemoteChain.blockchainId
        : setup.tokenHomeChain.blockchainId;
      if (!destinationBlockchainId) {
        return false;
      }
      return (
        setup.sendToken.address.toLowerCase() === fromToken.address.toLowerCase() &&
        destinationBlockchainId === toChain.blockchainId
      );
    });

    if (matchingSetup) {
      // Set flag to prevent the other useEffect from running
      isUpdatingTokenRef.current = true;
      
      // Only update if values actually changed to prevent infinite loops
      setFromToken((prevToken) => {
        if (!prevToken) {
          isUpdatingTokenRef.current = false;
          return prevToken;
        }
        
        const isHomeChainContext = sourceChainId !== null && matchingSetup.tokenHomeChainId === sourceChainId;
        const remoteAddress = isHomeChainContext ? matchingSetup.tokenRemoteAddress : matchingSetup.tokenHomeAddress;
        const bridgeContractAddress = isHomeChainContext ? matchingSetup.tokenHomeAddress : matchingSetup.tokenRemoteAddress;
        const normalizedPrevRemote = prevToken.remoteAddress?.toLowerCase();
        const normalizedRemote = remoteAddress?.toLowerCase();
        const normalizedPrevBridge = prevToken.bridgeContractAddress?.toLowerCase();
        const normalizedBridge = bridgeContractAddress?.toLowerCase();

        // Check if update is needed
        if (
          normalizedPrevRemote === normalizedRemote &&
          normalizedPrevBridge === normalizedBridge &&
          prevToken.icttSetupId === matchingSetup.id
        ) {
          isUpdatingTokenRef.current = false;
          return prevToken; // No change needed
        }

        const updatedToken = {
          ...prevToken,
          remoteAddress,
          bridgeContractAddress,
          icttSetupId: matchingSetup.id,
        };

        // Update flag after setting state
        setTimeout(() => {
          isUpdatingTokenRef.current = false;
        }, 0);

        return updatedToken;
      });

      // Update ref
      prevToChainIdRef.current = currentToChainId;
      setActiveIcttSetup(matchingSetup);
      if (matchingSetup.sendToken?.decimals !== undefined) {
        setTokenDecimals(matchingSetup.sendToken.decimals);
      }
    } else {
      setActiveIcttSetup(null);
    }
    // Use stable identifiers instead of objects to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toChain?.blockchainId, fromToken?.address, icttSetups.length, fromChain?.id]);

  // Theme handled in provider; keep to force re-render on toggle if needed
  useEffect(() => {}, [darkMode]);

  // Auto-reconnect handled by WalletProvider

  // Auto-calculate to amount when from amount changes
  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      // const calculatedAmount = Math.max(0, parseFloat(fromAmount) - (parseFloat(fromAmount) * 0.05));
      setToAmount(fromAmount);
    } else {
      setToAmount('0');
    }
  }, [fromAmount]);

  // Disconnect wallet - handled by WalletProvider context

  const selectChain = (chain: ChainOption, isFrom: boolean) => {
    if (isFrom) {
      setFromChain(chain);
      setShowFromModal(false);
      // Reset token and destination chain when source chain changes
      setFromToken(null);
      setToChain(null);
      setAvailableToChains([]);
      setActiveIcttSetup(null);
      // Reset refs
      prevTokenAddressRef.current = null;
      prevToChainIdRef.current = null;
      isUpdatingTokenRef.current = false;
      prevFromChainIdRef.current = null; // Reset to trigger fetch
      isUpdatingFromChainRef.current = false;
    } else {
      setToChain(chain);
      setShowToModal(false);
      // Reset ref when destination chain changes manually
      prevToChainIdRef.current = chain.blockchainId || null;
    }
  };

  const selectToken = (token: TokenOption) => {
    setFromToken(token);
    setTokenDecimals(token.decimals ?? null);
    setShowTokenModal(false);
  };

  // Helper function to get correct RPC URL from chain info
  const getRpcUrlForChain = (chain: ICTTSetup['tokenHomeChain'] | ICTTSetup['tokenRemoteChain']): string | undefined => {
    // Primary: Use rpcUrl from API if available
    if (chain.rpcUrl) {
      console.log(`Using rpcUrl from API for ${chain.name}:`, chain.rpcUrl);
      return chain.rpcUrl;
    }
    
    // Fallback: Derive from explorerUrl or blockchainId (for backwards compatibility)
    console.warn(`No rpcUrl in API response for ${chain.name}, attempting to derive...`);
    
    if (chain.explorerUrl) {
      // For C-Chain (Fuji testnet)
      if (chain.explorerUrl.includes('c-chain') || chain.blockchainId === '0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5') {
        return 'https://api.avax-test.network/ext/bc/C/rpc';
      }
      
      // For other subnets, append /rpc to explorerUrl
      if (chain.explorerUrl.includes('subnets-test.avax.network')) {
        return `${chain.explorerUrl}/rpc`;
      }
    }
    
    console.error(`Could not determine RPC URL for chain ${chain.name}`);
    return undefined;
  };

  // Helper to get numeric chainId from blockchain
  const getChainIdForChain = (chain: ICTTSetup['tokenHomeChain'] | ICTTSetup['tokenRemoteChain']): string | undefined => {
    // C-Chain Fuji testnet
    if (chain.blockchainId === '0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5') {
      return '43113'; // Fuji C-Chain
    }
    
    // Dispatch L1
    if (chain.blockchainId === '0x9f49313c3f022e9fe5b6e7c1d98f0f53d86e53456c5e075e1881cac1c15968e4') {
      return '918'; // Dispatch subnet chain ID
    }
    
    // If we can't determine, return undefined
    return undefined;
  };

  const handleSend = async () => {
    console.log('=== PRE-SEND DEBUG ===', {
      fromChain: {
        id: fromChain?.id,
        name: fromChain?.name,
        chainId: fromChain?.chainId,
        rpcUrl: fromChain?.rpcUrl,
      },
      fromToken: {
        symbol: fromToken?.symbol,
        address: fromToken?.address,
        bridgeContract: fromToken?.bridgeContractAddress,
      },
      toChain: {
        name: toChain?.name,
        blockchainId: toChain?.blockchainId,
        remoteAddress: toChain?.tokenRemoteAddress,
      },
    });

    if (!connectedWallet) {
      const message = 'Wallet not connected';
      setLocalError(message);
      await connect().catch(() => {});
      return;
    }
    
    if (!fromToken || !fromChain || !toChain || !fromAmount || parseFloat(fromAmount) <= 0) {
      const validationMessage = 'Please select chain, token, and enter an amount';
      setLocalError(validationMessage);
      return;
    }

    if (!walletAddress) {
      const walletMessage = 'Unable to resolve wallet address. Please reconnect your wallet.';
      setLocalError(walletMessage);
      return;
    }

    // Get RPC URL - use activeIcttSetup if available, otherwise fallback to fromChain
    let rpcUrl: string | undefined;
    
    if (activeIcttSetup) {
      rpcUrl = getRpcUrlForChain(activeIcttSetup.tokenHomeChain);
      console.log('Got RPC URL from activeIcttSetup:', {
        chain: activeIcttSetup.tokenHomeChain.name,
        rpcUrl,
        blockchainId: activeIcttSetup.tokenHomeChain.blockchainId,
      });
    } else if (fromChain.rpcUrl) {
      rpcUrl = fromChain.rpcUrl;
      console.log('Using RPC URL from fromChain:', rpcUrl);
    }
    
    console.log('=== RPC URL RESOLUTION ===', {
      hasActiveIcttSetup: !!activeIcttSetup,
      fromChainRpcUrl: fromChain.rpcUrl,
      resolvedRpcUrl: rpcUrl,
      fromChainName: fromChain.name,
    });

    if (!rpcUrl || !toChain.blockchainId || !toChain.tokenRemoteAddress || !toChain.tokenHomeAddress || !fromToken.bridgeContractAddress) {
      const configMessage = `Missing bridge configuration. Please try again. fromChain.rpcUrl: ${rpcUrl || 'missing'}, toChain.blockchainId: ${toChain.blockchainId || 'missing'}, toChain.tokenRemoteAddress: ${toChain.tokenRemoteAddress || 'missing'}, toChain.tokenHomeAddress: ${toChain.tokenHomeAddress || 'missing'}, fromToken.bridgeContractAddress: ${fromToken.bridgeContractAddress || 'missing'}`;
      setLocalError(configMessage);
      return;
    }

    setLocalError('');
    setCriticalError(null);
    setIsProcessingSend(true);
    setLastApprovalTxId(undefined);
    setLastSendTxId(undefined);
    setLastSendTxDetails(null);
    setMessageID(null);

    let bridgeError: Error | null = null;
    let bridgeCompleted = false;

    try {
      console.log('Starting handleSend', {
        fromAmount,
        fromToken,
        fromChain,
        toChain,
        walletAddress,
      });
      setLastSendTxDetails({ source: { initiatedAt: Date.now() } });
      resetBridgeLoader();
      const initialLoaderStates = cloneBridgeLoaderStates();
      initialLoaderStates[0] = {
        text: fromChain?.name
          ? `Bridge transaction initiated on ${fromChain.name}`
          : 'Bridge transaction initiated',
      };
      setBridgeLoaderStates(initialLoaderStates);
      setBridgeLoaderStep(0);
      setBridgeLoaderOpen(true);

      // Get signer from wallet
      if (!provider || !signer) {
        throw new Error('Wallet not connected');
      }
      
      // Verify network - get current chain ID from wallet
      const network = await provider.getNetwork();
      const currentChainId = network.chainId.toString();
      
      console.log('Network info:', {
        currentChainId,
        currentChainIdHex: '0x' + Number(currentChainId).toString(16),
        fromChainId: fromChain.id,
        fromChainName: fromChain.name,
        rpcUrl,
      });

      if (fromChain.chainId) {
        const expectedChainId = Number(fromChain.chainId);
        if (!Number.isNaN(expectedChainId) && expectedChainId !== network.chainId) {
          const expectedChainIdHex = ethers.utils.hexValue(expectedChainId);
          console.warn('Network mismatch detected. Attempting automatic switch...', {
            walletChainId: network.chainId,
            walletChainIdHex: ethers.utils.hexValue(network.chainId),
            expectedChainId,
            expectedChainIdHex,
          });

          const nativeCurrencyName =
            activeIcttSetup?.tokenHomeChain.nativeTokenName ??
            activeIcttSetup?.tokenRemoteChain.nativeTokenName ??
            fromChain.symbol ??
            'AVAX';
          const nativeCurrencySymbol =
            activeIcttSetup?.tokenHomeChain.nativeTokenSymbol ??
            activeIcttSetup?.tokenRemoteChain.nativeTokenSymbol ??
            fromChain.symbol ??
            'AVAX';
          const explorerUrl =
            activeIcttSetup?.tokenHomeChain.explorerUrl ??
            activeIcttSetup?.tokenRemoteChain.explorerUrl;

          const attemptChainAddition = async () => {
            if (!rpcUrl) {
              throw new Error(
                `Unable to add network ${fromChain.name}. Missing rpcUrl from configuration.`
              );
            }

            const addPayload = {
              chainId: expectedChainIdHex,
              chainName: fromChain.name ?? `Chain ${expectedChainId}`,
              nativeCurrency: {
                name: nativeCurrencyName,
                symbol: nativeCurrencySymbol,
                decimals: 18,
              },
              rpcUrls: [rpcUrl],
              blockExplorerUrls: explorerUrl ? [explorerUrl] : undefined,
            };

            console.log('Attempting wallet_addEthereumChain', addPayload);
            await provider.send('wallet_addEthereumChain', [addPayload]);
          };

          const attemptNetworkSwitch = async () => {
            try {
              await provider.send('wallet_switchEthereumChain', [{ chainId: expectedChainIdHex }]);
            } catch (switchError) {
              const switchErr = switchError as { code?: number | string } & Error;

              if (switchErr?.code === 4902 || switchErr?.code === '4902') {
                try {
                  await attemptChainAddition();
                  await provider.send('wallet_switchEthereumChain', [{ chainId: expectedChainIdHex }]);
                } catch (addError) {
                  const addErr = addError as Error & { code?: number };
                  throw new Error(
                    `Failed to add the ${fromChain.name} network to your wallet. ${
                      addErr?.message ?? addErr
                    }`
                  );
                }
              } else {
                const reason =
                  switchErr?.message ??
                  (typeof switchErr === 'object' ? JSON.stringify(switchErr) : String(switchErr));
                throw new Error(
                  `Automatic network switch rejected. Please switch to ${fromChain.name} (chainId ${expectedChainId} / ${expectedChainIdHex}) manually in your wallet. Reason: ${reason}`
                );
              }
            }

            const updatedNetwork = await provider.getNetwork();
            if (updatedNetwork.chainId !== expectedChainId) {
              throw new Error(
                `Attempted to switch networks but wallet is still on chainId ${updatedNetwork.chainId}. Please switch to ${fromChain.name} (chainId ${expectedChainId} / ${expectedChainIdHex}) manually in your wallet.`
              );
            }
          };

          try {
            await attemptNetworkSwitch();
            console.log('Network switch successful.', {
              newChainId: expectedChainId,
              newChainIdHex: expectedChainIdHex,
            });
          } catch (switchError) {
            console.error('Network switch failed:', switchError);
            throw switchError instanceof Error
              ? switchError
              : new Error(String(switchError));
          }
        } else {
          console.log('Network verification passed', {
            expectedChainId: expectedChainId.toString(),
            expectedChainIdHex: ethers.utils.hexValue(expectedChainId),
          });
        }
      } else {
        console.warn('fromChain.chainId not provided; skipping strict network verification.');
      }

      // Create contracts
      const tokenContract = new ethers.Contract(
        fromToken.address,
        [
          'function approve(address spender, uint256 amount) external returns (bool)',
          'function allowance(address owner, address spender) external view returns (uint256)',
          'function decimals() external view returns (uint8)',
          'function balanceOf(address account) external view returns (uint256)',
        ],
        signer
      );

      const bridgeContract = new ethers.Contract(
        fromToken.bridgeContractAddress!,
        ERC20TokenHomeABI.abi,
        signer
      );

      // Verify contract exists on current network
      const bridgeCodeCheck = await provider.getCode(fromToken.bridgeContractAddress!);
      if (bridgeCodeCheck === '0x' || bridgeCodeCheck === '0x0') {
        throw new Error(
          `Bridge contract not found at ${fromToken.bridgeContractAddress} on the current network (Chain ID: ${currentChainId}). ` +
          `Please make sure your wallet is connected to the correct network (${fromChain.name}).`
        );
      }

      const tokenCodeCheck = await provider.getCode(fromToken.address);
      if (tokenCodeCheck === '0x' || tokenCodeCheck === '0x0') {
        throw new Error(
          `Token contract not found at ${fromToken.address} on the current network (Chain ID: ${currentChainId}). ` +
          `Please make sure your wallet is connected to the correct network (${fromChain.name}).`
        );
      }

      // Convert amount to wei
      const decimals = await tokenContract.decimals();
      setTokenDecimals(Number(decimals));
      const amount = ethers.utils.parseUnits(fromAmount, decimals);

      // Check user balance
      const userAddress = await signer.getAddress();
      const balance = await tokenContract.balanceOf(userAddress);
      setTokenBalance(balance);
      
      console.log('Balance check:', {
        userAddress,
        balance: balance.toString(),
        balanceFormatted: ethers.utils.formatUnits(balance, decimals),
        requestedAmount: amount.toString(),
        requestedAmountFormatted: fromAmount,
        tokenAddress: fromToken.address,
        decimals,
      });
      
      if (balance.lt(amount)) {
        throw new Error(`Insufficient balance. You have ${ethers.utils.formatUnits(balance, decimals)} ${fromToken.symbol}, but trying to send ${fromAmount} ${fromToken.symbol}`);
      }

      // Check and approve allowance - approve the bridge contract to spend tokens
      const bridgeContractAddress = fromToken.bridgeContractAddress!;
      const allowance = await tokenContract.allowance(userAddress, bridgeContractAddress);
      setTokenAllowance(allowance);
      
      console.log('Allowance check:', {
        currentAllowance: allowance.toString(),
        currentAllowanceFormatted: ethers.utils.formatUnits(allowance, decimals),
        requiredAmount: amount.toString(),
        requiredAmountFormatted: fromAmount,
        bridgeContractAddress,
        needsApproval: allowance.lt(amount),
      });
      setBridgeLoaderStep(1);
      updateLoaderState(1, 'Checking token allowance...');
      
      if (allowance.lt(amount)) {
        updateLoaderState(1, 'Requesting token approval...');
        try {
          console.log('Approving MaxUint256 to minimise repeated approvals.');
          const approveTx = await tokenContract.approve(bridgeContractAddress, ethers.constants.MaxUint256);
          console.log('Approval transaction sent:', approveTx.hash);
          setLastApprovalTxId(approveTx.hash);
          await approveTx.wait();
          console.log('Approval confirmed');
          const updatedAllowance = await tokenContract.allowance(userAddress, bridgeContractAddress);
          setTokenAllowance(updatedAllowance);
          console.log('Updated allowance after approval:', {
            updatedAllowance: updatedAllowance.toString(),
            updatedAllowanceFormatted: ethers.utils.formatUnits(updatedAllowance, decimals),
          });
          if (updatedAllowance < amount) {
            throw new Error('Allowance is still insufficient after approval. Please try again.');
          }
          updateLoaderState(
            1,
            `Token allowance ready (approval tx ${shortenHash(approveTx.hash)})`
          );
        } catch (approveError: unknown) {
          if (isUserRejectedRequest(approveError)) {
            console.warn('Token approval was rejected by the user.');
            const rejectionError =
              approveError instanceof Error
                ? approveError
                : new Error('Approval rejected by user');
            bridgeError = rejectionError;
            setCriticalError(null);
            setLocalError('Approval rejected');
            updateLoaderState(1, 'Approval rejected');
            scheduleLoaderReset(2500);
            return;
          }

          console.error('Approval error:', approveError);
          const errorMessage = approveError instanceof Error 
            ? approveError.message 
            : (approveError && typeof approveError === 'object' && 'reason' in approveError && typeof approveError.reason === 'string')
            ? approveError.reason
            : 'Unknown error';
          throw new Error(`Failed to approve tokens: ${errorMessage}`);
        }
      } else {
        console.log('Sufficient allowance already exists, skipping approval');
        updateLoaderState(1, 'Token allowance already sufficient');
      }

      // Prepare bridge transaction
      let destinationBlockchainID: string;
      try {
        const blockchainIdHex = toChain.blockchainId!.startsWith('0x')
          ? toChain.blockchainId!
          : '0x' + toChain.blockchainId!;

        console.log('Processing blockchain ID:', {
          original: toChain.blockchainId,
          hex: blockchainIdHex,
          length: blockchainIdHex.length,
        });

        const bytes = ethers.utils.arrayify(blockchainIdHex);
        if (bytes.length > 32) {
          throw new Error(`BlockchainId too long: ${bytes.length} bytes. Maximum is 32 bytes.`);
        }

        const paddedBytes = new Uint8Array(32);
        paddedBytes.set(bytes, 32 - bytes.length);
        destinationBlockchainID = ethers.utils.hexlify(paddedBytes);

        if (destinationBlockchainID.length !== 66) {
          throw new Error(
            `Invalid blockchainId format: ${toChain.blockchainId}. Must be 32 bytes (64 hex chars). ` +
            `Got: ${destinationBlockchainID} (${destinationBlockchainID.length} chars)`
          );
        }

        console.log('Padded blockchain ID:', destinationBlockchainID);
      } catch (blockchainIdError) {
        console.error('Error processing blockchain ID:', blockchainIdError);
        throw new Error(
          `Invalid blockchain ID format: ${toChain.blockchainId}. ` +
          `${blockchainIdError instanceof Error ? blockchainIdError.message : String(blockchainIdError)}`
        );
      }

      const destinationTokenTransferrerAddress = toChain.tokenRemoteAddress;
      const recipient = userAddress;
      const primaryFeeTokenAddress = ethers.constants.AddressZero; // Use native token for fees
      const primaryFee = BigInt(0); // No fee for now
      const secondaryFee = BigInt(0);
      // CRITICAL: Use 250,000 (250k) not 250 million! This is a common mistake
      const gasLimitSource = requiredGasLimit && requiredGasLimit.trim() !== '' ? requiredGasLimit : '250000';
      let parsedRequiredGasLimit: bigint;
      try {
        parsedRequiredGasLimit = BigInt(gasLimitSource);
      } catch (gasError) {
        throw new Error(`Invalid required gas limit: ${gasLimitSource}`);
      }
      const multiHopFallback = ethers.constants.AddressZero;

      const sendInput = {
        destinationBlockchainID,
        destinationTokenTransferrerAddress,
        recipient,
        primaryFeeTokenAddress,
        primaryFee,
        secondaryFee,
        requiredGasLimit: parsedRequiredGasLimit,
        multiHopFallback,
      };

      // Validate addresses
      if (!ethers.utils.isAddress(destinationTokenTransferrerAddress)) {
        throw new Error(`Invalid destination token address: ${destinationTokenTransferrerAddress}`);
      }
      if (!ethers.utils.isAddress(recipient)) {
        throw new Error(`Invalid recipient address: ${recipient}`);
      }

      // Send bridge transaction - use the bridge contract address
      // First, encode the transaction to see what we're actually sending
      try {
        const encodedData = bridgeContract.interface.encodeFunctionData('send', [sendInput, amount]);
        console.log('Full encoded data:', encodedData);
      } catch (encodeError) {
        console.error('Failed to encode transaction:', encodeError);
        throw encodeError;
      }

      // Build the transaction to verify all parameters
      try {
        console.log('=== BUILDING TRANSACTION ===');
        const populatedTx = await bridgeContract.populateTransaction.send(sendInput, amount);
        console.log('Populated transaction:', {
          to: populatedTx.to,
          from: populatedTx.from,
          data: populatedTx.data?.substring(0, 100) + '...',
          dataLength: populatedTx.data?.length,
        });
      } catch (populateError) {
        console.error('Failed to populate transaction:', populateError);
      }

      // Try to estimate gas to get better error messages
      try {
        console.log('=== ATTEMPTING GAS ESTIMATION ===');
        console.log('Calling: bridgeContract.estimateGas.send(sendInput, amount)');
        console.log('With account:', userAddress);
        const gasEstimate = await bridgeContract.estimateGas.send(sendInput, amount);
        console.log('✅ Gas estimate successful:', gasEstimate.toString());
      } catch (estimateError: unknown) {
        console.error('❌ Gas estimation failed:', estimateError);
        
        // Provide detailed error information
        let errorDetails = '';
        if (estimateError && typeof estimateError === 'object') {
          if ('code' in estimateError) {
            errorDetails += `\nError code: ${estimateError.code}`;
          }
          if ('action' in estimateError) {
            errorDetails += `\nAction: ${estimateError.action}`;
          }
        }
        
        // Common issues to check
        const commonIssues = [
          '\nPossible causes:',
          '1. Your wallet is connected to the wrong network',
          `2. Make sure you are connected to ${fromChain.name}`,
          '3. The bridge contract may not be deployed on this network',
          '4. Insufficient balance or allowance',
          '5. The destination blockchain ID may be incorrect',
        ].join('\n');
        
        // Try to decode the error if possible
        if (estimateError && typeof estimateError === 'object' && 'data' in estimateError) {
          try {
            // Attempt to decode error
            const errorData = estimateError as { data: unknown };
            if (errorData.data && typeof errorData.data === 'string') {
              const decodedError = bridgeContract.interface.parseError(errorData.data);
              throw new Error(`Transaction would fail: ${decodedError?.name || 'Unknown error'}${errorDetails}${commonIssues}`);
            }
          } catch (decodeError) {
            // If we can't decode, provide a more helpful message
            const errorMessage = estimateError instanceof Error 
              ? estimateError.message 
              : (estimateError && typeof estimateError === 'object' && 'reason' in estimateError && typeof estimateError.reason === 'string')
              ? estimateError.reason
              : 'Transaction validation failed';
            throw new Error(`${errorMessage}${errorDetails}${commonIssues}`);
          }
        }
        
        const errorMessage = estimateError instanceof Error 
          ? estimateError.message 
          : (estimateError && typeof estimateError === 'object' && 'reason' in estimateError && typeof estimateError.reason === 'string')
          ? estimateError.reason
          : 'Transaction validation failed';
        throw new Error(`${errorMessage}${errorDetails}${commonIssues}`);
      }

      setBridgeLoaderStep(2);
      updateLoaderState(2, 'Submitting bridge transaction...');
      const tx = await bridgeContract.send(sendInput, amount);
      setLastSendTxId(tx.hash);
      updateLoaderState(
        2,
        `Transaction submitted: ${shortenHash(tx.hash)} (awaiting confirmation)`
      );
      
      // Wait for transaction
      const receipt: ethers.providers.TransactionReceipt = await tx.wait();
      setLastSendTxDetails((prev) => ({
        ...prev,
        source: { ...prev?.source, confirmedAt: Date.now() },
      }));

      setBridgeLoaderStep(3);
      if (receipt?.transactionHash) {
        updateLoaderState(
          3,
          `Bridge confirmed: ${shortenHash(receipt.transactionHash)}`
        );
      } else {
        updateLoaderState(3, 'Bridge transaction confirmed');
      }

      const teleporterMessengerAddress = activeIcttSetup?.tokenHomeChain.teleporterAddress;
      if (teleporterMessengerAddress && receipt?.logs?.length) {
        try {
          const teleporterInterface = new ethers.utils.Interface(TeleporterMessengerABI.abi);
          const messengerLog = receipt.logs.find(
            (log) =>
              log.address &&
              log.address.toLowerCase() === teleporterMessengerAddress.toLowerCase()
          );
          if (messengerLog) {
            const parsedLog = teleporterInterface.parseLog({
              topics: Array.isArray(messengerLog.topics) ? messengerLog.topics : [],
              data: messengerLog.data,
            });
            const potentialMessageId =
              (parsedLog?.args as Record<string, unknown>)?.messageID ??
              (parsedLog?.args as Record<string, unknown>)?.messageId;
            if (typeof potentialMessageId === 'string') {
              setMessageID(potentialMessageId);
              setTryCount(0);
              const shortMessageId =
                potentialMessageId.length > 20
                  ? `${potentialMessageId.slice(0, 10)}...${potentialMessageId.slice(-6)}`
                  : potentialMessageId;
              const confirmationPrefix =
                receipt?.transactionHash !== undefined
                  ? `Bridge confirmed: ${shortenHash(receipt.transactionHash)}`
                  : 'Bridge transaction confirmed';
              updateLoaderState(
                3,
                `${confirmationPrefix} (Teleporter message ${shortMessageId})`
              );
            }
          }
        } catch (logError) {
          console.warn('Failed to decode teleporter messenger log:', logError);
        }
      } else if (!teleporterMessengerAddress) {
        console.warn('Teleporter messenger address unavailable for log decoding.');
      }

      await loadTokenInfo();
      bridgeCompleted = true;
      scheduleLoaderReset(3500);
      
      // Reset form
      setFromAmount('');
      setToAmount('');
      
    } catch (error: unknown) {
      // console.error('Bridge error:', error);
      const normalizedError = error instanceof Error ? error : new Error(String(error));
      if (isUserRejectedRequest(error) || isUserRejectedRequest(normalizedError) || (bridgeError && isUserRejectedRequest(bridgeError))) {
        const rejectionMessage = 'Approval rejected';
        setCriticalError(null);
        setLocalError(rejectionMessage);
        updateLoaderState(bridgeLoaderStepRef.current, rejectionMessage);
        scheduleLoaderReset(2500);
        return;
      }
      const errorMessage =
        normalizedError?.message || 'Bridge transaction failed. Please try again.';
      bridgeError = normalizedError;
      setCriticalError(normalizedError);
      setLocalError(errorMessage);
      const erroredStep = Math.min(
        bridgeLoaderStepRef.current,
        DEFAULT_BRIDGE_LOADING_STATES.length - 1
      );
      updateLoaderState(erroredStep, `Error: ${errorMessage}`);
      scheduleLoaderReset(5000);
    } finally {
      setIsProcessingSend(false);
      if (!bridgeCompleted && !bridgeError) {
        resetBridgeLoader();
      }
    }
  };

  // toggleDarkMode comes from context

  const ChainModal = ({ isOpen, onClose, onSelect, isFrom, chains: modalChains, loading }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSelect: (chain: ChainOption) => void; 
    isFrom: boolean;
    chains: ChainOption[];
    loading: boolean;
  }) => {
    const [searchQuery, setSearchQuery] = useState('');
  
    if (!isOpen) return null;
  
    const filteredChains = modalChains.filter(
      chain =>
        chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chain.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-3xl w-full max-w-md shadow-2xl border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {isFrom ? 'Select source chain' : 'Select destination chain'}
            </h3>
            <button onClick={onClose} className={`p-2 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-colors`}>
              <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
  
          <div className="p-4 h-m">
            <div className="relative mb-4">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chains"
                className={`w-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all`}
              />
            </div>
  
            <div className="flex flex-col gap-4 h-[500px]">
            {loading ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Loading chains...
              </div>
            ) : filteredChains.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {isFrom ? 'No chains available' : 'No destination chains available. Please select a source chain first.'}
              </div>
            ) : (
              <>
                {/* Recommended Chains */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {filteredChains.slice(0, 5).map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => { onSelect(chain); }}
                      className={`flex flex-col items-center gap-1 px-3 py-2 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors flex-shrink-0`}
                    >
                      {chain.logoUrl ? (
                        <Image src={chain.logoUrl} alt={chain.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                      ) : (
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center text-white text-xs font-bold`}>
                          {chain.symbol.slice(0, 2)}
                        </div>
                      )}
                      <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{chain.symbol}</span>
                    </button>
                  ))}
                </div>
  
                {/* Filtered Chains List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredChains.map((chain) => (
                    <button
                      key={chain.id}
                      onClick={() => { onSelect(chain); }}
                      className={`w-full flex items-center gap-3 p-3 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-colors`}
                    >
                      {chain.logoUrl ? (
                        <Image src={chain.logoUrl} alt={chain.name} width={40} height={40} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                          {chain.symbol.slice(0, 2)}
                        </div>
                      )}
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{chain.name}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{chain.symbol}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    );
  };

  const TokenModal = ({ isOpen, onClose, onSelect, tokens: modalTokens }: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSelect: (token: TokenOption) => void; 
    tokens: TokenOption[];
  }) => {
    const [searchQuery, setSearchQuery] = useState('');
  
    if (!isOpen) return null;
  
    const filteredTokens = modalTokens.filter(
      token =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`${darkMode ? 'bg-gray-900' : 'bg-white'} rounded-3xl w-full max-w-md shadow-2xl border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Select a token</h3>
            <button onClick={onClose} className={`p-2 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-colors`}>
              <X className={`w-5 h-5 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`} />
            </button>
          </div>
  
          <div className="p-4 h-m">
            <div className="relative mb-4">
              <Search className={`absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens"
                className={`w-full ${darkMode ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-900'} pl-12 pr-4 py-3 rounded-2xl outline-none focus:ring-2 focus:ring-red-500 transition-all`}
              />
            </div>
  
            <div className="flex flex-col gap-4 h-[500px]">
            {filteredTokens.length === 0 ? (
              <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                {availableTokens.length === 0 ? 'No tokens available. Please select a source chain first.' : 'No tokens found.'}
              </div>
            ) : (
              <>
                {/* Recommended Tokens */}
                <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                  {filteredTokens.slice(0, 5).map((token) => (
                    <button
                      key={`${token.symbol}-${token.address}`}
                      onClick={() => { onSelect(token); }}
                      className={`flex flex-col items-center gap-1 px-3 py-2 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors flex-shrink-0`}
                    >
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-white text-xs font-bold`}>
                        {token.symbol.slice(0, 2)}
                      </div>
                      <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{token.symbol}</span>
                    </button>
                  ))}
                </div>
  
                {/* Filtered Tokens List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredTokens.map((token) => (
                    <button
                      key={`${token.symbol}-${token.address}`}
                      onClick={() => { onSelect(token); }}
                      className={`w-full flex items-center gap-3 p-3 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-colors`}
                    >
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                        {token.symbol.slice(0, 2)}
                      </div>
                      <div className="flex-1 text-left">
                        <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{token.name}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{token.symbol} · {token.address.slice(0, 6)}...{token.address.slice(-4)}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          </div>
        </div>
      </div>
    );
  };
  

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-white'} relative overflow-hidden transition-colors duration-300`}>

      {/* Main Content */}
      <main className={`relative z-10 flex flex-col items-center justify-center px-4 py-16 transition-colors duration-300`}>
        <div className="text-center mb-12">
          <h1 className={`text-6xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
            Avalink
          </h1>
          <p className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
            The interchain bridge
          </p>
        </div>

        <div className="w-full max-w-md">
          {/* Swap Card */}
          <div className={`${darkMode ? 'bg-gray-900/50' : 'bg-white/50'} backdrop-blur-xl rounded-3xl border ${darkMode ? 'border-gray-800/50' : 'border-gray-200'} p-3 shadow-2xl transition-colors duration-300`}>
            {/* From Token Input */}
            <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'} rounded-2xl p-4 mb-1 transition-colors duration-300`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1 w-full sm:w-auto order-1 sm:order-2">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Chain</span>
                  <button
                    onClick={() => setShowFromModal(true)}
                    className={`flex items-center gap-2 px-3 py-2 ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-2xl transition-colors w-full sm:w-auto sm:flex-shrink-0 sm:min-w-[120px]`}
                  >
                    {fromChain ? (
                      <>
                        {fromChain.logoUrl ? (
                          <Image src={fromChain.logoUrl} alt={fromChain.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${fromChain.color} flex items-center justify-center text-white text-xs font-bold`}>
                            {fromChain.symbol.slice(0, 2)}
                          </div>
                        )}
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{fromChain.name}</span>
                      </>
                    ) : (
                      <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {loadingChains ? 'Loading...' : 'Select chain'}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 w-full order-2 sm:order-1 sm:flex-1">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Amount</span>
                  <input
                    type="number"
                    value={fromAmount}
                    min={0}
                    max={1000000}
                    onChange={(e) => {
                      const rawValue = e.target.value;
                      if (rawValue === '') {
                        setFromAmount('');
                        return;
                      }

                      const numericValue = Number(rawValue);
                      if (Number.isNaN(numericValue)) {
                        return;
                      }

                      if (numericValue < 0) {
                        setFromAmount('0');
                      } else if (numericValue > MAX_TRANSFER_AMOUNT) {
                        setFromAmount(MAX_TRANSFER_AMOUNT.toString());
                      } else {
                        setFromAmount(rawValue);
                      }
                    }}
                    placeholder="0"
                    className={`appearance-none bg-transparent text-4xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} outline-none w-full transition-colors duration-300`}
                  />
                </div>
              </div>
            </div>

            {/* Token Selection Dropdown */}
            <div className="my-3">
              <button
                onClick={() => setShowTokenModal(true)}
                disabled={availableTokens.length === 0}
                className={`w-full ${darkMode ? 'bg-gray-800/50 hover:bg-gray-800/70' : 'bg-gray-100/50 hover:bg-gray-100/70'} backdrop-blur-xl rounded-2xl border ${darkMode ? 'border-gray-700/50' : 'border-gray-200'} p-4 transition-colors duration-300 flex items-center justify-between ${availableTokens.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3">
                  {fromToken ? (
                    <>
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${fromToken.color} flex items-center justify-center text-white text-lg font-bold`}>
                        {fromToken.symbol.slice(0, 2)}
                      </div>
                      <div className="text-left">
                        <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{fromToken.symbol}</div>
                        <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fromToken.name}</div>
                      </div>
                    </>
                  ) : (
                    <div className="text-left">
                      <div className={`text-lg font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {loadingTokens ? 'Loading tokens...' : availableTokens.length === 0 && fromChain ? 'No tokens available' : availableTokens.length === 0 ? 'Select chain first' : 'Select token'}
                      </div>
                    </div>
                  )}
                </div>
                <ChevronDown className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
              </button>
            </div>

            {/* Swap Button */}
            {/* <div className="flex justify-center items-center -my-4 relative z-10">
              <button
                onClick={handleSwapTokens}
                className={`p-2 ${darkMode ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} border-6 ${darkMode ? 'border-gray-900' : 'border-white'} rounded-xl transition-all`}
              >
                <ArrowUpDown className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
              </button>
            </div> */}

            {/* To Token Input */}
            <div className={`${darkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'} mt-1 rounded-2xl p-4 mb-3 transition-colors duration-300`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1 w-full sm:w-auto order-1 sm:order-2">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Destination Chain</span>
                  <button
                    onClick={() => setShowToModal(true)}
                    disabled={availableToChains.length === 0}
                    className={`flex items-center gap-2 px-3 py-2 ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-2xl transition-colors w-full sm:w-auto sm:flex-shrink-0 sm:min-w-[120px] ${availableToChains.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {toChain ? (
                      <>
                        {toChain.logoUrl ? (
                          <Image src={toChain.logoUrl} alt={toChain.name} width={24} height={24} className="w-6 h-6 rounded-full object-cover" />
                        ) : (
                          <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${toChain.color} flex items-center justify-center text-white text-xs font-bold`}>
                            {toChain.symbol.slice(0, 2)}
                          </div>
                        )}
                        <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{toChain.name}</span>
                      </>
                    ) : (
                      <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {loadingToChains ? 'Loading...' : availableToChains.length === 0 && fromToken ? 'No chains available' : availableToChains.length === 0 ? (fromToken ? 'No chains available' : 'Select token first') : 'Select chain'}
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                  </button>
                </div>
                <div className="flex flex-col gap-1 w-full order-2 sm:order-1 sm:flex-1">
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Destination Amount</span>
                  <div className={`text-4xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} w-full transition-colors duration-300`}>
                    {toAmount || '0'}
                  </div>
                </div>
              </div>
            </div>

            {/* Bridge Tokens Button */}
            <button 
              onClick={handleSend}
              disabled={!fromToken || !fromChain || !toChain || isProcessingSend}
              className={`w-full py-4 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-500 rounded-2xl font-semibold text-lg border border-red-500/30 transition-all ${!fromToken || !fromChain || !toChain || isProcessingSend ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isProcessingSend
                ? 'Processing...'
                : connectedWallet && fromToken && toChain
                ? `Receive ${toAmount || '0'} ${fromToken.symbol} on ${toChain.symbol}`
                : 'Get started'}
            </button>
            {localError ? (
              <p className="mt-2 text-center text-sm text-red-400">
                {localError}
              </p>
            ) : null}
            <div className="w-full flex justify-center">
              <Loader
                loadingStates={bridgeLoaderStates}
                loading={bridgeLoaderOpen}
                manualStepIndex={bridgeLoaderStep}
                loop={false}
                onClose={isProcessingSend ? undefined : resetBridgeLoader}
                variant="inline"
                themeMode={darkMode ? 'dark' : 'light'}
                className="max-w-md"
              />
            </div>

            <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-6 transition-colors duration-300`}>
              Transfer assets between all avalanche subnets.
            </p>
          </div>
        </div>
      </main>

      {/* Modals */}
      <ChainModal
        isOpen={showFromModal}
        onClose={() => setShowFromModal(false)}
        onSelect={(chain) => selectChain(chain, true)}
        isFrom={true}
        chains={availableChains}
        loading={loadingChains}
      />
      <ChainModal
        isOpen={showToModal}
        onClose={() => setShowToModal(false)}
        onSelect={(chain) => selectChain(chain, false)}
        isFrom={false}
        chains={availableToChains}
        loading={loadingToChains}
      />
      
      <TokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSelect={(token) => selectToken(token)}
        tokens={availableTokens}
      />
    </div>
  );
}