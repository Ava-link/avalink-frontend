'use client';

import React, { useState, useEffect } from 'react';
import { ChevronDown, X, Search, ArrowUpDown } from 'lucide-react';
import { useWallet } from './providers/WalletProvider';

// const tokens = [
//   { symbol: 'BEAM', name: 'Merit Circle', address: '0x1234...abcd', color: 'from-red-400 to-red-600' },
//   { symbol: 'DFK', name: 'DeFi Kingdoms', address: '0x5678...efgh', color: 'from-red-500 to-red-700' },
//   { symbol: 'DOS', name: 'DOS Labs', address: '0x9abc...ijkl', color: 'from-red-400 to-red-600' },
//   { symbol: 'DEX', name: 'Dexalot Exchange', address: '0xdef0...mnop', color: 'from-red-500 to-red-700' },
//   { symbol: 'LOCO', name: 'Loco Legends', address: '0x1234...qrst', color: 'from-red-400 to-red-600' },
//   { symbol: 'SHRAP', name: 'Shrapnel', address: '0x5678...uvwx', color: 'from-red-500 to-red-700' },
//   { symbol: 'MELD', name: 'MELD', address: '0x9abc...yzab', color: 'from-red-400 to-red-600' },
//   { symbol: 'MINT', name: 'Mintara', address: '0xdef0...cdef', color: 'from-red-500 to-red-700' },
// ];
const chains = [
  { symbol: 'BEAM', name: 'Merit Circle', address: '0x7138...2C50', color: 'from-purple-400 to-purple-600' },
  { symbol: 'DFK', name: 'DeFi Kingdoms', address: '0x6A9b8...aB48', color: 'from-blue-400 to-blue-600' },
  { symbol: 'DOS', name: 'DOS Labs', address: '0xdAC1...1ec7', color: 'from-green-400 to-green-600' },
  { symbol: 'DEX', name: 'Dexalot Exchange', address: '0x2260...C599', color: 'from-orange-400 to-orange-600' },
  { symbol: 'LOCO', name: 'Loco Legends', address: '0x7f38...2C50', color: 'from-blue-300 to-blue-500' },
  { symbol: 'SHRAP', name: 'Shrapnel', address: '0xcbb7...398f', color: 'from-purple-500 to-blue-600' },
  { symbol: 'MELD', name: 'MELD', address: '0x4c3E...6883', color: 'from-gray-600 to-gray-800' },
];
const tokens = [
  { symbol: 'USDC', name: 'USDC', address: '0x7138...2C50', color: 'from-purple-400 to-purple-600' },
  { symbol: 'USDT', name: 'USDT', address: '0x6A9b8...aB48', color: 'from-blue-400 to-blue-600' },
  { symbol: 'DAI', name: 'DAI', address: '0xdAC1...1ec7', color: 'from-green-400 to-green-600' },
];
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
  const { darkMode, connectedWallet, connect } = useWallet();
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState(tokens[0]);
  const [fromChain, setFromChain] = useState(chains[0]);
  const [toChain, setToChain] = useState(chains[1]);
  const [showFromModal, setShowFromModal] = useState(false);
  const [showToModal, setShowToModal] = useState(false);
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showWalletModal, setShowWalletModal] = useState(false);

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

  // Disconnect wallet
  const disconnectWallet = () => {
    // disconnect is handled by context
    setToastMessage('Wallet disconnected');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // Handle swap chains
  const handleSwapTokens = () => {
    const tempFromChain = fromChain;
    const tempFromAmount = fromAmount;
    setFromChain(toChain);
    setFromAmount(toAmount);
    setToChain(tempFromChain);
    setToAmount(tempFromAmount);
  };

  const selectChain = (chain: typeof chains[0], isFrom: boolean) => {
    if (isFrom) {
      setFromChain(chain);
      setShowFromModal(false);
    } else {
      setToChain(chain);
      setShowToModal(false);
    }
  };


  const selectToken = (token: typeof tokens[0], isFrom: boolean) => {
    if (isFrom) {
      setFromToken(token);
      setShowFromModal(false);
    } else {
      setFromToken(token);
      setShowToModal(false);
    }
  };

  const handleGetStarted = () => {
    if (!connectedWallet) {
      setShowWalletModal(true);
      return;
    }
    
    const message = `Transfer: ${fromAmount || '0'} ${fromToken.symbol} from ${fromChain.symbol} → ${toAmount || '0'} ${fromToken.symbol} to ${toChain.symbol}`;
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 6000);
  };

  // toggleDarkMode comes from context

  const ChainModal = ({ isOpen, onClose, onSelect, currentChain, isFrom }: { isOpen: boolean, onClose: () => void, onSelect: (chain: typeof chains[0]) => void, currentChain: typeof chains[0], isFrom: boolean }) => {
    const [searchQuery, setSearchQuery] = useState('');
  
    if (!isOpen) return null;
  
    const filteredChains = chains.filter(
      chain =>
        chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        chain.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`bg-${darkMode ? 'gray-900' : 'white'} rounded-3xl w-full max-w-md shadow-2xl border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Select a chain</h3>
            <button onClick={onClose} className={`p-2 hover:bg-${darkMode ? 'gray-800' : 'gray-100'} rounded-xl transition-colors`}>
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
            {/* Recommended Chains */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {chains.slice(0, 5).map((chain) => (
                <button
                  key={chain.symbol}
                  onClick={() => { onSelect(chain); }}
                  className={`flex flex-col items-center gap-1 px-3 py-2 ${darkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} rounded-xl transition-colors flex-shrink-0`}
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {chain.symbol.slice(0, 2)}
                  </div>
                  <span className={`text-xs ${darkMode ? 'text-white' : 'text-gray-900'} font-medium`}>{chain.symbol}</span>
                </button>
              ))}
            </div>
  
            {/* Filtered Chains List */}
            <div className="max-h-96 overflow-y-auto">
              {filteredChains.map((chain) => (
                <button
                  key={chain.symbol}
                  onClick={() => { onSelect(chain); }}
                  className={`w-full flex items-center gap-3 p-3 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-colors`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${chain.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {chain.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{chain.name}</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{chain.symbol} · {chain.address}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
          </div>
        </div>
      </div>
    );
  };

  const TokenModal = ({ isOpen, onClose, onSelect, currentToken, isFrom }: { isOpen: boolean, onClose: () => void, onSelect: (token: typeof tokens[0]) => void, currentToken: typeof tokens[0], isFrom: boolean }) => {
    const [searchQuery, setSearchQuery] = useState('');
  
    if (!isOpen) return null;
  
    const filteredTokens = tokens.filter(
      token =>
        token.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        token.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    );
  
    return (
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className={`bg-${darkMode ? 'gray-900' : 'white'} rounded-3xl w-full max-w-md shadow-2xl border ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className={`flex items-center justify-between p-5 border-b ${darkMode ? 'border-gray-800' : 'border-gray-200'}`}>
            <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Select a token</h3>
            <button onClick={onClose} className={`p-2 hover:bg-${darkMode ? 'gray-800' : 'gray-100'} rounded-xl transition-colors`}>
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
            {/* Recommended Tokens */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {tokens.slice(0, 5).map((token) => (
                <button
                  key={token.symbol}
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
                  key={token.symbol}
                  onClick={() => { onSelect(token); }}
                  className={`w-full flex items-center gap-3 p-3 ${darkMode ? 'hover:bg-gray-800' : 'hover:bg-gray-100'} rounded-xl transition-colors`}
                >
                  <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${token.color} flex items-center justify-center text-white font-bold text-sm flex-shrink-0`}>
                    {token.symbol.slice(0, 2)}
                  </div>
                  <div className="flex-1 text-left">
                    <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>{token.name}</div>
                    <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>{token.symbol} · {token.address}</div>
                  </div>
                </button>
              ))}
            </div>
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
          {/* Token Selection Dropdown */}
          <button
            onClick={() => setShowTokenModal(true)}
            className={`w-full bg-${darkMode ? 'gray-900/50' : 'white/50'} backdrop-blur-xl rounded-3xl border ${darkMode ? 'border-gray-800/50' : 'border-gray-200'} p-4 shadow-2xl transition-colors duration-300 mb-4 hover:${darkMode ? 'bg-gray-900/70' : 'bg-white/70'} flex items-center justify-between`}
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${fromToken.color} flex items-center justify-center text-white text-lg font-bold`}>
                {fromToken.symbol.slice(0, 2)}
              </div>
              <div className="text-left">
                <div className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{fromToken.symbol}</div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{fromToken.name}</div>
              </div>
            </div>
            <ChevronDown className={`w-6 h-6 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
          </button>

          {/* Swap Card */}
          <div className={`bg-${darkMode ? 'gray-900/50' : 'white/50'} backdrop-blur-xl rounded-3xl border ${darkMode ? 'border-gray-800/50' : 'border-gray-200'} p-3 shadow-2xl transition-colors duration-300`}>
            {/* From Token Input */}
            <div className={`bg-${darkMode ? 'gray-800/50' : 'gray-100/50'} rounded-2xl p-4 mb-1 transition-colors duration-300`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Sell</span>
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
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${fromChain.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {fromChain.symbol.slice(0, 2)}
                  </div>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{fromChain.symbol}</span>
                  <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-2 transition-colors duration-300`}>$0</div>
            </div>

            {/* Swap Button */}
            <div className="flex justify-center items-center -my-4 relative z-10">
              <button
                onClick={handleSwapTokens}
                className={`p-2 ${darkMode ? 'bg-gray-800/80 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} border-6 ${darkMode ? 'border-gray-900' : 'border-white'} rounded-xl transition-all`}
              >
                <ArrowUpDown className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
              </button>
            </div>

            {/* To Token Input */}
            <div className={`bg-${darkMode ? 'gray-800/50' : 'gray-100/50'} rounded-2xl p-4 mb-3 transition-colors duration-300`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Buy</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className={`text-4xl font-medium ${darkMode ? 'text-white' : 'text-gray-900'} w-full transition-colors duration-300`}>
                  {toAmount || '0'}
                </div>
                <button
                  onClick={() => setShowToModal(true)}
                  className={`flex items-center gap-2 px-3 py-2 ${darkMode ? 'bg-gray-700/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-2xl transition-colors flex-shrink-0 min-w-[120px]`}
                >
                  <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${toChain.color} flex items-center justify-center text-white text-xs font-bold`}>
                    {toChain.symbol.slice(0, 2)}
                  </div>
                  <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>{toChain.symbol}</span>
                  <ChevronDown className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                </button>
              </div>
              <div className={`text-sm ${darkMode ? 'text-gray-500' : 'text-gray-400'} mt-2 transition-colors duration-300`}>$0</div>
            </div>

            {/* Bridge Tokens Button */}
            <button 
              onClick={handleGetStarted}
              className={`w-full py-4 bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 text-red-500 rounded-2xl font-semibold text-lg border border-red-500/30 transition-all`}
            >
              {connectedWallet ? `Receive ${toAmount} ${fromToken.symbol} on ${toChain.symbol}` : 'Get started'}
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
        currentChain={fromChain}
        isFrom={true}
      />
      <ChainModal
        isOpen={showToModal}
        onClose={() => setShowToModal(false)}
        onSelect={(chain) => selectChain(chain, false)}
        currentChain={toChain}
        isFrom={false}
      />
      
      <TokenModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
        onSelect={(token) => {
          setFromToken(token);
          setShowTokenModal(false);
        }}
        currentToken={fromToken}
        isFrom={true}
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