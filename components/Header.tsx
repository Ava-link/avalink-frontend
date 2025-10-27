"use client"

import { Sun, Moon, Plus, Home } from 'lucide-react';
import { useRouter } from 'next/navigation';



export default function Header({ darkMode, toggleDarkMode, connectedWallet, walletAddress, disconnectWallet, setShowWalletModal }: { darkMode: boolean, toggleDarkMode: () => void, connectedWallet: boolean, walletAddress: string, disconnectWallet: () => void, setShowWalletModal: (show: boolean) => void }) {
  const router = useRouter();

  const handleAddChain = () => {
    router.push('/newchainregister');
  };

  const handleHome = () => {
    router.push('/');
  };

  return (
    <>
      {/* Header */}
        <header className={`relative z-10 flex items-center justify-between px-6 py-4 border-b ${darkMode ? 'border-gray-800/50 bg-gray-900/30' : 'border-gray-200 bg-white/30'} backdrop-blur-xl transition-colors duration-300`}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 flex items-center justify-center">
            {/* Black outer triangle */}
            <div className="w-0 h-0 border-l-10 border-r-10 border-b-20 border-l-transparent border-r-transparent border-b-black relative">
              {/* Red inner triangle */}
              <div className="absolute top-1 left-0 w-0 h-0 border-l-8 border-r-8 border-b-16 border-l-transparent border-r-transparent border-b-red-500" />
            </div>
          </div>

            <span className={`text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Avalink</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Home Button */}
          <button 
            onClick={handleHome}
            className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-xl transition-colors`}
          >
            <Home className="w-4 h-4" />
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Home</span>
          </button>

          {/* Add Chain Button */}
          <button 
            onClick={handleAddChain}
            className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-xl transition-colors`}
          >
            <Plus className="w-4 h-4" />
            <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Chain</span>
          </button>

          {/* Dark/Light Mode Toggle Button */}
          <button 
            onClick={toggleDarkMode} 
            className={`p-2 ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-200'} rounded-xl transition-colors`}
          >
            {darkMode ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-700" />
            )}
          </button>
          
          {/* Wallet Connection */}
          {connectedWallet ? (
            <div className="flex items-center gap-2">
              <div className="px-3 py-2 bg-gray-800 text-white rounded-xl text-sm font-mono">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </div>
              <button 
                onClick={disconnectWallet}
                className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all"
              >
                Disconnect
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setShowWalletModal(true)}
              className={`px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all`}
            >
              Connect
            </button>
          )}
        </div>
      </header>
    </>
  );
}