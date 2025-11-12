"use client"

import { Sun, Moon, Plus, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import Image from 'next/image';

export default function Header({ 
  darkMode, 
  toggleDarkMode, 
  connectedWallet, 
  walletAddress, 
  disconnectWallet, 
  onConnect,
  onNavigateHome,
  onNavigateAddChain
}: { 
  darkMode: boolean, 
  toggleDarkMode: () => void, 
  connectedWallet: boolean, 
  walletAddress: string, 
  disconnectWallet: () => Promise<void>, 
  onConnect: () => void,
  onNavigateHome?: () => void,
  onNavigateAddChain?: () => void
}) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddChain = () => {
    if (onNavigateAddChain) {
      onNavigateAddChain();
    }
    setIsOpen(false);
  };

  const handleHome = () => {
    if (onNavigateHome) {
      onNavigateHome();
    }
    setIsOpen(false);
  };

  const handleConnect = () => {
    onConnect();
    setIsOpen(false);
  };

  const handleDisconnect = async () => {
    await disconnectWallet().catch(() => {});
    setIsOpen(false);
  };

  return (
    <header className={`relative z-10 flex items-center justify-between px-4 md:px-6 py-4 border-b ${darkMode ? 'border-gray-800/50 bg-gray-900/30' : 'border-gray-200 bg-white/80'} backdrop-blur-xl transition-colors duration-300`}>
      {/* Left Side - Logo, Brand, and Mode Toggle */}
      <div className="flex items-center gap-3 md:gap-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 flex items-center justify-center">
            {/* Black outer triangle */}
            {/* <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-b-[20px] border-l-transparent border-r-transparent border-b-black relative"> */}
              {/* Red inner triangle */}
              {/* <div className="absolute top-[1px] -left-[8px] w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-red-500" /> */}
            {/* </div> */}

            <Image src="/avalinktempNoBG.png" alt="Avalink" width={32} height={32} />
          </div>
          <span className={`text-lg md:text-xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Avalink
          </span>
        </div>

        {/* Dark/Light Mode Toggle Button */}
        <button 
          onClick={toggleDarkMode} 
          className={`p-2 ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-200'} rounded-xl transition-colors`}
          aria-label="Toggle theme"
        >
          {darkMode ? (
            <Sun className="w-5 h-5 text-yellow-400" />
          ) : (
            <Moon className="w-5 h-5 text-gray-700" />
          )}
        </button>
      </div>

      {/* Right Side - Desktop Navigation */}
      <div className="hidden md:flex items-center gap-3">
        <button 
          onClick={handleHome}
          className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-xl transition-colors`}
        >
          <Home className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Home</span>
        </button>

        <button 
          onClick={handleAddChain}
          className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-xl transition-colors`}
        >
          <Plus className={`w-4 h-4 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
          <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Chain</span>
        </button>
        
        {connectedWallet ? (
          <div className="flex items-center gap-2">
            <div className="px-3 py-2 bg-gray-800 text-white rounded-xl text-sm font-mono">
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
            <button 
              onClick={handleDisconnect}
              className="px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl text-sm font-medium transition-all"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button 
            onClick={handleConnect}
            className="px-5 py-2 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all"
          >
            Connect
          </button>
        )}
      </div>

      {/* Right Side - Mobile Menu */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button 
              className={`p-2 ${darkMode ? 'hover:bg-gray-800/50' : 'hover:bg-gray-200'} rounded-xl transition-colors`}
              aria-label="Open menu"
            >
              <Menu className={`w-6 h-6 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
            </button>
          </SheetTrigger>
          <SheetContent 
            side="right" 
            className={`w-[280px] sm:w-[320px] ${darkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200'}`}
          >
            <div className="mx-2 flex flex-col gap-4 mt-16">
              {/* Home Button */}
              <button 
                onClick={handleHome}
                className={`flex items-center gap-3 px-4 py-3 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-xl transition-colors w-full`}
              >
                <Home className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
                <span className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Home</span>
              </button>

              {/* Add Chain Button */}
              <button 
                onClick={handleAddChain}
                className={`flex items-center gap-3 px-4 py-3 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-xl transition-colors w-full`}
              >
                <Plus className={`w-5 h-5 ${darkMode ? 'text-white' : 'text-gray-900'}`} />
                <span className={`text-base font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Chain</span>
              </button>

              {/* Wallet Connection */}
              <div className="pt-4 border-t border-gray-700">
                {connectedWallet ? (
                  <div className="flex flex-col gap-3">
                    <div className="px-4 py-3 bg-gray-800 text-white rounded-xl text-sm font-mono text-center">
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                    <button 
                      onClick={handleDisconnect}
                      className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all"
                    >
                      Disconnect Wallet
                    </button>
                  </div>
                ) : (
                  <button 
                    onClick={handleConnect}
                    className="w-full px-4 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-all"
                  >
                    Connect Wallet
                  </button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}