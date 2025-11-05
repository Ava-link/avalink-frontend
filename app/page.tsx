'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, X, Search } from 'lucide-react';
import { useWallet } from './providers/WalletProvider';
import { ethers } from 'ethers';
import ERC20TokenHomeABI from '../abi/ERC20TokenHome.json';
import Image from 'next/image';
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
  tokenHomeChain: ICTTChain;
  tokenRemoteChain: ICTTChain;
  tokenHomeToken: TokenInfo;
  tokenRemoteToken: TokenInfo;
}

interface ChainOption {
  id: string;
  name: string;
  symbol: string;
  logoUrl: string;
  color: string;
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
  remoteAddress?: string;
  bridgeContractAddress?: string;
  icttSetupId?: string;
}
const FloatingIcon = ({
  symbol,
  delay,
  x,
  y,
  size = 64,
  textSize = 16,
  color,
}: {
  symbol: string;
  delay: string;
  x: string;
  y: string;
  size?: number;
  textSize?: number;
  color: string;
}) => (
  <div
    className="absolute opacity-30 hover:opacity-100 transition-all duration-300 group cursor-pointer"
    style={{
      left: x,
      top: y,
      animation: `float 20s ease-in-out infinite`,
      animationDelay: delay,
      filter: 'blur(1px)',
    }}
  >
    <div
      className={`rounded-full bg-gradient-to-br ${color} flex items-center justify-center font-bold shadow-lg transition-all duration-300 group-hover:blur-none`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${textSize}px`,
        color: 'white',
        filter: 'inherit',
      }}
    >
      {symbol}
    </div>
  </div>
);

// Toast component
const Toast = ({ message, isVisible, onClose }: { message: string, isVisible: boolean, onClose: () => void }) => {
  if (!isVisible) return null;
  
  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2">
      <span>{message}</span>
      <button onClick={onClose} className="ml-2">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Wallet Connection Modal
const WalletModal = ({ isOpen, onClose, onConnect }: { isOpen: boolean, onClose: () => void, onConnect: (walletType: string) => void }) => {
  if (!isOpen) return null;

  const wallets = [
    {
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect using MetaMask browser extension',
      id: 'metamask'
    },
    {
      name: 'Core Wallet',
      icon: '💎',
      description: 'Connect using Core Wallet',
      id: 'core'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-3xl w-full max-w-md shadow-2xl border border-gray-800">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h3 className="text-lg font-semibold text-white">Connect Wallet</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-xl transition-colors">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        
        <div className="p-4">
          <div className="space-y-3">
            {wallets.map((wallet) => (
              <button
                key={wallet.id}
                onClick={() => onConnect(wallet.id)}
                className="w-full flex items-center gap-4 p-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors"
              >
                <div className="text-2xl">{wallet.icon}</div>
                <div className="flex-1 text-left">
                  <div className="text-white font-medium">{wallet.name}</div>
                  <div className="text-gray-500 text-sm">{wallet.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AvalinkMain() {
  const { darkMode, connectedWallet, connect, provider, signer } = useWallet();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<TokenOption | null>(null);
  const [fromChain, setFromChain] = useState<ChainOption | null>(null);
  const [toChain, setToChain] = useState<ChainOption | null>(null);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);
  
  // API data states
  const [availableChains, setAvailableChains] = useState<ChainOption[]>([]);
  const [availableToChains, setAvailableToChains] = useState<ChainOption[]>([]);
  const [availableTokens, setAvailableTokens] = useState<TokenOption[]>([]);
  const [loadingChains, setLoadingChains] = useState(true);
  const [loadingToChains, setLoadingToChains] = useState(false);
  const [loadingTokens, setLoadingTokens] = useState(false);
  const [icttSetups, setIcttSetups] = useState<ICTTSetup[]>([]);
  
  // Refs to track previous values and prevent infinite loops
  const prevTokenAddressRef = useRef<string | null>(null);
  const prevToChainIdRef = useRef<string | null>(null);
  const isUpdatingTokenRef = useRef(false);
  const prevFromChainIdRef = useRef<string | null>(null);
  const isUpdatingFromChainRef = useRef(false);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';

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
            rpcUrl: chain.explorerUrl,
          }));
          
          setAvailableChains(chains);
          if (chains.length > 0 && !fromChain) {
            setFromChain(chains[0]);
          }
        }
      } catch (error) {
        console.error('Error fetching chains:', error);
        setToastMessage('Failed to load chains. Please try again.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
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

      try {
        setLoadingTokens(true);
        const response = await fetch(`${backendUrl}/available/ictt/${fromChain.id}`);
        const data = await response.json();
        
        if (data.success && data.icttSetup) {
          // Store all ICTT setups for later filtering
          setIcttSetups(data.icttSetup);
          
          // Always update fromChain with complete information from tokenHomeChain in API response
          if (fromChain && data.icttSetup.length > 0) {
            const firstSetup = data.icttSetup[0];
            const tokenHomeChain = firstSetup.tokenHomeChain;
            
            // Always update fromChain with tokenHomeChain data, but only if rpcUrl actually changed to prevent loops
            const needsUpdate = !fromChain.rpcUrl || 
                               (tokenHomeChain.rpcUrl && fromChain.rpcUrl !== tokenHomeChain.rpcUrl);
            
            if (needsUpdate) {
              isUpdatingFromChainRef.current = true;
              
              setFromChain((prevChain) => {
                if (!prevChain) {
                  isUpdatingFromChainRef.current = false;
                  return prevChain;
                }
                
                // Check if update is actually needed (rpcUrl changed)
                if (tokenHomeChain.rpcUrl && prevChain.rpcUrl === tokenHomeChain.rpcUrl) {
                  isUpdatingFromChainRef.current = false;
                  return prevChain;
                }
                
                // Update fromChain with all available data from tokenHomeChain
                // fromChain IS tokenHomeChain, so use all data from API
                const updatedChain = {
                  ...prevChain,
                  rpcUrl: tokenHomeChain.rpcUrl || prevChain.rpcUrl,
                  // Ensure we have all the chain info from the API
                  name: tokenHomeChain.name || prevChain.name,
                  symbol: tokenHomeChain.nativeTokenSymbol || prevChain.symbol,
                  logoUrl: tokenHomeChain.logoUrl || prevChain.logoUrl,
                };
                
                console.log('Updated fromChain with tokenHomeChain:', {
                  previous: prevChain,
                  updated: updatedChain,
                  tokenHomeChain: tokenHomeChain,
                });
                
                // Reset flag after state update
                setTimeout(() => {
                  isUpdatingFromChainRef.current = false;
                }, 0);
                
                return updatedChain;
              });
            }
          }
          
          // Extract unique tokens from tokenHomeToken
          const tokenMap = new Map<string, TokenOption>();
          
          data.icttSetup.forEach((setup: ICTTSetup) => {
            const tokenKey = setup.tokenHomeToken.address.toLowerCase();
            if (!tokenMap.has(tokenKey)) {
              tokenMap.set(tokenKey, {
                symbol: setup.tokenHomeToken.symbol,
                name: setup.tokenHomeToken.name,
                address: setup.tokenHomeToken.address,
                color: getColorFromName(setup.tokenHomeToken.name),
                icttSetupId: setup.id,
                bridgeContractAddress: setup.tokenHomeAddress,
              });
            }
          });
          
          const uniqueTokens = Array.from(tokenMap.values());
          setAvailableTokens(uniqueTokens);
          
          // Reset token and destination chain when source chain changes
          setFromToken(null);
          setAvailableToChains([]);
          setToChain(null);
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
          prevFromChainIdRef.current = null;
        }
      } catch (error) {
        console.error('Error fetching tokens:', error);
        setToastMessage('Failed to load available tokens. Please try again.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setAvailableTokens([]);
        setIcttSetups([]);
        setFromToken(null);
        setAvailableToChains([]);
        setToChain(null);
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
      if (!fromToken || icttSetups.length === 0) {
        setAvailableToChains([]);
        setToChain(null);
        prevTokenAddressRef.current = null;
        return;
      }

      try {
        setLoadingToChains(true);
        
        // Filter ICTT setups that match the selected token
        const matchingSetups = icttSetups.filter(
          (setup: ICTTSetup) => setup.tokenHomeToken.address.toLowerCase() === fromToken.address.toLowerCase()
        );
        
        const toChains: ChainOption[] = [];
        
        matchingSetups.forEach((setup: ICTTSetup) => {
          toChains.push({
            id: setup.tokenRemoteChain.blockchainId,
            name: setup.tokenRemoteChain.name,
            symbol: setup.tokenRemoteChain.nativeTokenSymbol,
            logoUrl: setup.tokenRemoteChain.logoUrl,
            color: getColorFromName(setup.tokenRemoteChain.name),
            blockchainId: setup.tokenRemoteChain.blockchainId,
            tokenRemoteAddress: setup.tokenRemoteAddress,
            tokenHomeAddress: setup.tokenHomeAddress,
            icttSetupId: setup.id,
            rpcUrl: setup.tokenRemoteChain.rpcUrl,
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
          prevToChainIdRef.current = null;
        }

        // Update ref after processing
        prevTokenAddressRef.current = currentTokenAddress;
      } catch (error) {
        console.error('Error fetching destination chains:', error);
        setToastMessage('Failed to load available destination chains. Please try again.');
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        setAvailableToChains([]);
        setToChain(null);
        prevTokenAddressRef.current = null;
      } finally {
        setLoadingToChains(false);
      }
    };

    fetchToChains();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromToken?.address, icttSetups.length]);

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
    const matchingSetup = icttSetups.find(
      (setup: ICTTSetup) =>
        setup.tokenHomeToken.address.toLowerCase() === fromToken.address.toLowerCase() &&
        setup.tokenRemoteChain.blockchainId === toChain.blockchainId
    );

    if (matchingSetup) {
      // Set flag to prevent the other useEffect from running
      isUpdatingTokenRef.current = true;
      
      // Only update if values actually changed to prevent infinite loops
      setFromToken((prevToken) => {
        if (!prevToken) {
          isUpdatingTokenRef.current = false;
          return prevToken;
        }
        
        // Check if update is needed
        if (
          prevToken.remoteAddress?.toLowerCase() === matchingSetup.tokenRemoteAddress.toLowerCase() &&
          prevToken.bridgeContractAddress?.toLowerCase() === matchingSetup.tokenHomeAddress.toLowerCase() &&
          prevToken.icttSetupId === matchingSetup.id
        ) {
          isUpdatingTokenRef.current = false;
          return prevToken; // No change needed
        }
        
        // Update ref after setting state
        setTimeout(() => {
          isUpdatingTokenRef.current = false;
        }, 0);
        
        return {
          ...prevToken,
          remoteAddress: matchingSetup.tokenRemoteAddress,
          bridgeContractAddress: matchingSetup.tokenHomeAddress,
          icttSetupId: matchingSetup.id,
        };
      });

      // Update ref
      prevToChainIdRef.current = currentToChainId;
    }
    // Use stable identifiers instead of objects to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toChain?.blockchainId, fromToken?.address, icttSetups.length]);

  // Theme handled in provider; keep to force re-render on toggle if needed
  useEffect(() => {}, [darkMode]);

  // Auto-reconnect handled by WalletProvider

  // Auto-calculate to amount when from amount changes
  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const calculatedAmount = Math.max(0, parseFloat(fromAmount) - (parseFloat(fromAmount) * 0.05));
      setToAmount(calculatedAmount.toString());
    } else {
      setToAmount('');
    }
  }, [fromAmount]);

  // Handle wallet connection via context
  const connectWallet = async (walletType: string) => {
    try {
      await connect(walletType as 'metamask' | 'core');
      setShowWalletModal(false);
      setToastMessage(`Connected to ${walletType === 'core' ? 'Core Wallet' : 'MetaMask'}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Connection error:', error);
      setToastMessage('Connection failed. Please try again.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Disconnect wallet - handled by WalletProvider context

  const selectChain = (chain: ChainOption, isFrom: boolean) => {
    if (isFrom) {
      setFromChain(chain);
      setShowFromModal(false);
      // Reset token and destination chain when source chain changes
      setFromToken(null);
      setToChain(null);
      setAvailableToChains([]);
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
    setShowTokenModal(false);
  };

  const handleGetStarted = async () => {
    if (!connectedWallet) {
      setShowWalletModal(true);
      return;
    }
    
    if (!fromToken || !fromChain || !toChain || !fromAmount || parseFloat(fromAmount) <= 0) {
      setToastMessage('Please select chain, token, and enter an amount');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    // Get RPC URL from stored ICTT setups (most reliable source from API)
    // fromChain IS tokenHomeChain, so get rpcUrl from tokenHomeChain in ICTT setups
    let rpcUrl = fromChain.rpcUrl;
    
    console.log('Getting RPC URL:', {
      fromChainRpcUrl: fromChain.rpcUrl,
      fromChainId: fromChain.id,
      fromChainName: fromChain.name,
      icttSetupsCount: icttSetups.length,
      fromTokenAddress: fromToken.address,
    });
    
    // Always check ICTT setups first since fromChain IS tokenHomeChain
    if (icttSetups.length > 0) {
      // Find setup that matches the current token
      const matchingSetup = icttSetups.find(
        (setup: ICTTSetup) => 
          setup.tokenHomeToken.address.toLowerCase() === fromToken.address.toLowerCase()
      );
      
      console.log('Matching setup for token:', {
        found: !!matchingSetup,
        tokenHomeChainRpcUrl: matchingSetup?.tokenHomeChain.rpcUrl,
        tokenHomeChain: matchingSetup?.tokenHomeChain,
      });
      
      // Get RPC URL from tokenHomeChain (the source chain in the setup)
      // fromChain IS tokenHomeChain, so this is the correct source
      if (matchingSetup?.tokenHomeChain.rpcUrl) {
        rpcUrl = matchingSetup.tokenHomeChain.rpcUrl;
      } else if (icttSetups[0]?.tokenHomeChain.rpcUrl) {
        // Fallback to first setup's tokenHomeChain
        rpcUrl = icttSetups[0].tokenHomeChain.rpcUrl;
      }
      
      // If still no rpcUrl, log all available setups for debugging
      if (!rpcUrl) {
        console.warn('No rpcUrl found in tokenHomeChain. All setups:', icttSetups.map(s => ({
          tokenHomeChain: s.tokenHomeChain.name,
          hasRpcUrl: !!s.tokenHomeChain.rpcUrl,
          rpcUrl: s.tokenHomeChain.rpcUrl,
          tokenHomeChainKeys: Object.keys(s.tokenHomeChain),
        })));
      }
    }
    
    // Final fallback: try to find it in availableChains
    if (!rpcUrl) {
      const chainWithRpc = availableChains.find(c => c.id === fromChain.id && c.rpcUrl);
      rpcUrl = chainWithRpc?.rpcUrl;
    }
    
    console.log('Final RPC URL:', rpcUrl);

    if (!rpcUrl || !toChain.blockchainId || !toChain.tokenRemoteAddress || !toChain.tokenHomeAddress || !fromToken.bridgeContractAddress) {
      setToastMessage(`Missing bridge configuration. Please try again. fromChain.rpcUrl: ${rpcUrl || 'missing'}, toChain.blockchainId: ${toChain.blockchainId || 'missing'}, toChain.tokenRemoteAddress: ${toChain.tokenRemoteAddress || 'missing'}, toChain.tokenHomeAddress: ${toChain.tokenHomeAddress || 'missing'}, fromToken.bridgeContractAddress: ${fromToken.bridgeContractAddress || 'missing'}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      setToastMessage('Initiating bridge transaction...');
      setShowToast(true);

      // Get signer from wallet
      if (!provider || !signer) {
        throw new Error('Wallet not connected');
      }
      
      // Note: User should ensure wallet is connected to the correct network
      // Network switching would require wallet-specific implementation

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

      // Convert amount to wei
      const decimals = await tokenContract.decimals();
      const amount = ethers.parseUnits(fromAmount, decimals);

      // Check user balance
      const userAddress = await signer.getAddress();
      const balance = await tokenContract.balanceOf(userAddress);
      if (balance < amount) {
        throw new Error(`Insufficient balance. You have ${ethers.formatUnits(balance, decimals)} tokens, but trying to send ${fromAmount}`);
      }

      // Check and approve allowance - approve the bridge contract to spend tokens
      const bridgeContractAddress = fromToken.bridgeContractAddress!;
      const allowance = await tokenContract.allowance(userAddress, bridgeContractAddress);
      if (allowance < amount) {
        setToastMessage('Approving token spending...');
        try {
          const approveTx = await tokenContract.approve(bridgeContractAddress, amount);
          await approveTx.wait();
          setToastMessage('Approval confirmed. Sending tokens...');
        } catch (approveError: unknown) {
          console.error('Approval error:', approveError);
          const errorMessage = approveError instanceof Error 
            ? approveError.message 
            : (approveError && typeof approveError === 'object' && 'reason' in approveError && typeof approveError.reason === 'string')
            ? approveError.reason
            : 'Unknown error';
          throw new Error(`Failed to approve tokens: ${errorMessage}`);
        }
      }

      // Prepare bridge transaction
      // Ensure blockchainId is exactly 32 bytes (0x-prefixed hex string)
      const blockchainIdHex = toChain.blockchainId!.startsWith('0x') 
        ? toChain.blockchainId! 
        : '0x' + toChain.blockchainId!;
      
      // Convert to bytes, pad to 32 bytes, then convert back to hex
      const bytes = ethers.getBytes(blockchainIdHex);
      if (bytes.length > 32) {
        throw new Error(`BlockchainId too long: ${bytes.length} bytes. Maximum is 32 bytes.`);
      }
      
      // Pad to 32 bytes (zeros on the left)
      const paddedBytes = new Uint8Array(32);
      paddedBytes.set(bytes, 32 - bytes.length);
      const destinationBlockchainID = ethers.hexlify(paddedBytes);

      // Validate it's exactly 32 bytes (66 chars with 0x)
      if (destinationBlockchainID.length !== 66) {
        throw new Error(`Invalid blockchainId format: ${toChain.blockchainId}. Must be 32 bytes (64 hex chars). Got: ${destinationBlockchainID} (${destinationBlockchainID.length} chars)`);
      }

      const destinationTokenTransferrerAddress = toChain.tokenRemoteAddress;
      const recipient = userAddress;
      const primaryFeeTokenAddress = ethers.ZeroAddress; // Use native token for fees
      const primaryFee = BigInt(0); // No fee for now
      const secondaryFee = BigInt(0);
      const requiredGasLimit = BigInt(100000); // Gas limit
      const multiHopFallback = ethers.ZeroAddress;

      const sendInput = {
        destinationBlockchainID,
        destinationTokenTransferrerAddress,
        recipient,
        primaryFeeTokenAddress,
        primaryFee,
        secondaryFee,
        requiredGasLimit,
        multiHopFallback,
      };

      // Validate addresses
      if (!ethers.isAddress(destinationTokenTransferrerAddress)) {
        throw new Error(`Invalid destination token address: ${destinationTokenTransferrerAddress}`);
      }
      if (!ethers.isAddress(recipient)) {
        throw new Error(`Invalid recipient address: ${recipient}`);
      }

      console.log('Bridge transaction parameters:', {
        destinationBlockchainID,
        destinationTokenTransferrerAddress,
        recipient,
        amount: amount.toString(),
        amountFormatted: fromAmount,
      });

      // Send bridge transaction - use the bridge contract address
      // First, try to estimate gas to get better error messages
      try {
        const gasEstimate = await bridgeContract.send.estimateGas(sendInput, amount);
        console.log('Gas estimate:', gasEstimate.toString());
      } catch (estimateError: unknown) {
        console.error('Gas estimation error:', estimateError);
        // Try to decode the error if possible
        if (estimateError && typeof estimateError === 'object' && 'data' in estimateError) {
          try {
            // Attempt to decode error
            const errorData = estimateError as { data: unknown };
            if (errorData.data && typeof errorData.data === 'string') {
              const decodedError = bridgeContract.interface.parseError(errorData.data);
              throw new Error(`Transaction would fail: ${decodedError?.name || 'Unknown error'}`);
            }
          } catch {
            // If we can't decode, provide a more helpful message
            const errorMessage = estimateError instanceof Error 
              ? estimateError.message 
              : (estimateError && typeof estimateError === 'object' && 'reason' in estimateError && typeof estimateError.reason === 'string')
              ? estimateError.reason
              : 'Please check your inputs and try again';
            throw new Error(`Transaction would fail: ${errorMessage}`);
          }
        }
        const errorMessage = estimateError instanceof Error 
          ? estimateError.message 
          : (estimateError && typeof estimateError === 'object' && 'reason' in estimateError && typeof estimateError.reason === 'string')
          ? estimateError.reason
          : 'Please check your inputs and try again';
        throw new Error(`Transaction would fail: ${errorMessage}`);
      }

      setToastMessage('Sending bridge transaction...');
      const tx = await bridgeContract.send(sendInput, amount);
      setToastMessage(`Transaction submitted: ${tx.hash}`);
      
      // Wait for transaction
      const receipt = await tx.wait();
      setToastMessage(`Bridge successful! Transaction: ${receipt.hash}`);
      
      // Reset form
      setFromAmount('');
      setToAmount('');
      
    } catch (error: unknown) {
      console.error('Bridge error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Bridge transaction failed. Please try again.';
      setToastMessage(errorMessage);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
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
      {/* Floating Background Icons */}

      <FloatingIcon symbol="BEAM" delay="2s" x="85%" y="20%" color="from-red-400 to-red-600" size={184} textSize={46} />
      <FloatingIcon symbol="DFK" delay="0s" x="5%" y="15%" color="from-red-500 to-red-700" size={120} textSize={30} />
      <FloatingIcon symbol="DOS" delay="4s" x="10%" y="70%" color="from-red-400 to-red-600" size={98} textSize={24} />
      <FloatingIcon symbol="DEX" delay="6s" x="90%" y="60%" color="from-red-500 to-red-700" size={64} textSize={16} />
      <FloatingIcon symbol="LOCO" delay="8s" x="50%" y="10%" color="from-red-400 to-red-600" size={87} textSize={22} />
      <FloatingIcon symbol="SHRAP" delay="10s" x="75%" y="80%" color="from-red-500 to-red-700" size={66} textSize={16} />
      <FloatingIcon symbol="MELD" delay="12s" x="20%" y="40%" color="from-red-400 to-red-600" size={98} textSize={24} />

{/* 
      <FloatingIcon symbol="BEAM" delay="2s" x="85%" y="20%" color="from-purple-400 to-purple-600" size={184} textSize={46} />
      <FloatingIcon symbol="DFK" delay="0s" x="5%" y="15%" color="from-blue-400 to-blue-600" size={120} textSize={30} />
      <FloatingIcon symbol="DOS" delay="4s" x="10%" y="70%" color="from-green-400 to-green-600" size={98} textSize={24} />
      <FloatingIcon symbol="DEX" delay="6s" x="90%" y="60%" color="from-orange-400 to-orange-600" size={64} textSize={16} />
      <FloatingIcon symbol="LOCO" delay="8s" x="50%" y="10%" color="from-blue-300 to-blue-500" size={87} textSize={22} />
      <FloatingIcon symbol="SHRAP" delay="10s" x="75%" y="80%" color="from-purple-500 to-blue-600" size={66} textSize={16} />
      <FloatingIcon symbol="MELD" delay="12s" x="20%" y="40%" color="from-gray-600 to-gray-800" size={98} textSize={24} /> */}

      {/* Header is rendered from layout via provider */}
      
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
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Source Chain</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <input
                  type="number"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0"
                  className={`bg-transparent text-4xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} outline-none w-full transition-colors duration-300`}
                />
                <button
                  onClick={() => setShowFromModal(true)}
                  className={`flex items-center gap-2 px-3 py-2 ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-2xl transition-colors flex-shrink-0 min-w-[120px]`}
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
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{fromChain.symbol}</span>
                    </>
                  ) : (
                    <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {loadingChains ? 'Loading...' : 'Select chain'}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
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
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Destination Chain</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className={`text-4xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} w-full transition-colors duration-300`}>
                  {toAmount || '0'}
                </div>
                <button
                  onClick={() => setShowToModal(true)}
                  disabled={availableToChains.length === 0}
                  className={`flex items-center gap-2 px-3 py-2 ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-2xl transition-colors flex-shrink-0 min-w-[120px] ${availableToChains.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
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
                      <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{toChain.symbol}</span>
                    </>
                  ) : (
                    <span className={`font-semibold ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                      {loadingToChains ? 'Loading...' : availableToChains.length === 0 && fromToken ? 'No chains available' : availableToChains.length === 0 ? (fromToken ? 'No chains available' : 'Select token first') : 'Select chain'}
                    </span>
                  )}
                  <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>
            </div>

            {/* Bridge Tokens Button */}
            <button 
              onClick={handleGetStarted}
              disabled={!fromToken || !fromChain || !toChain}
              className={`w-full py-4 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-500 rounded-2xl font-semibold text-lg border border-red-500/30 transition-all ${!fromToken || !fromChain || !toChain ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {connectedWallet && fromToken && toChain ? `Receive ${toAmount || '0'} ${fromToken.symbol} on ${toChain.symbol}` : 'Get started'}
            </button>
          </div>

          <p className={`text-center ${darkMode ? 'text-gray-400' : 'text-gray-500'} text-sm mt-6 transition-colors duration-300`}>
            Transfer assets between all avalanche subnets.
          </p>
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
      
      <WalletModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
        onConnect={connectWallet}
      />

      {/* Toast Notification */}
      <Toast 
        message={toastMessage} 
        isVisible={showToast} 
        onClose={() => setShowToast(false)} 
      />

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px) translateX(0px) rotate(0deg);
          }
          25% {
            transform: translateY(-30px) translateX(20px) rotate(5deg);
          }
          50% {
            transform: translateY(-15px) translateX(-20px) rotate(-5deg);
          }
          75% {
            transform: translateY(-25px) translateX(15px) rotate(3deg);
          }
        }
        .animate-float {
          animation: float 20s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}