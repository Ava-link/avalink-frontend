"use client"

import React from "react";
import Image from "next/image";
import { Sun, Moon, Plus, Home, Menu, Link as LinkIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

type HeaderProps = {
  darkMode: boolean;
  toggleDarkMode: () => void;
  connectedWallet: boolean;
  walletAddress: string;
  disconnectWallet: () => Promise<void> | void;
  onConnect: () => Promise<void>;
  onNavigateHome?: () => void;
  onNavigateAddChain?: () => void;
  onNavigateBridge?: () => void;
};

// Header component: preserves original functionality but styled as a modular compartment
export function Header({ 
  darkMode, 
  toggleDarkMode, 
  connectedWallet, 
  walletAddress, 
  disconnectWallet, 
  onConnect,
  onNavigateHome,
  onNavigateAddChain,
  onNavigateBridge,
}: HeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddChain = () => { onNavigateAddChain?.(); setIsOpen(false); };
  const handleHome = () => { onNavigateHome?.(); setIsOpen(false); };
  const handleBridge = () => { onNavigateBridge?.(); setIsOpen(false); };
  const handleConnect = () => { void onConnect(); setIsOpen(false); };
  const handleDisconnect = async () => { 
    try {
      await disconnectWallet();
    } catch {
      // ignore disconnect errors
    }
    setIsOpen(false); 
  };

  return (
    <header
      className={`relative z-10 flex items-center justify-between px-4 md:px-6 py-4 border-b backdrop-blur-xl transition-colors duration-300 
        ${darkMode ? 'border-[#222222] bg-[#0E0E0E] text-white' : 'border-black bg-[#f2f2f2] text-black'}`}
    >
      {/* Left */}
      <div className="flex items-center gap-3 md:gap-8">
        <div className="flex items-center gap-2">
          <Image src="/avalinktempNoBG.png" alt="Avalink" width={32} height={32} />
          <span className={`text-lg md:text-xl font-bold ${darkMode ? 'text-white' : 'text-black'}`}>Avalink</span>
        </div>

        <button
          onClick={toggleDarkMode}
          className={`cursor-target p-2 transition-colors border 
            ${darkMode ? 'border-gray-600 bg-[#202020] hover:bg-gray-700 text-white' : 'border-black bg-white hover:bg-gray-200 text-black'}`}
        >
          {darkMode ? <Sun className="w-5 h-5 text-yellow-300" /> : <Moon className="w-5 h-5 text-black" />}
        </button>
      </div>

      {/* Desktop Nav */}
      <div className="hidden md:flex items-center gap-3">
        <button
          onClick={handleHome}
          className={`cursor-target flex h-10 items-center gap-2 px-4 py-2 border transition-colors 
            ${darkMode ? 'border-gray-700 bg-[#202020] hover:bg-gray-700 text-white' : 'border-black bg-white hover:bg-gray-200 text-black'}`}
        >
          <Home className="w-4 h-4" /> Home
        </button>

        <button
          onClick={handleBridge}
          className={`cursor-target flex h-10 items-center gap-2 px-4 py-2 border transition-colors 
            ${darkMode ? 'border-gray-700 bg-[#202020] hover:bg-gray-700 text-white' : 'border-black bg-white hover:bg-gray-200 text-black'}`}
        >
          <LinkIcon className="w-4 h-4" /> Bridge
        </button>

        <button
          onClick={handleAddChain}
          className={`cursor-target flex h-10 items-center gap-2 px-4 py-2 border transition-colors 
            ${darkMode ? 'border-gray-700 bg-[#202020] hover:bg-gray-700 text-white' : 'border-black bg-white hover:bg-gray-200 text-black'}`}
        >
          <Plus className="w-4 h-4" /> Add Chain
        </button>

        {connectedWallet ? (
          <div className="flex items-center gap-2">
            <div className={`cursor-target px-3 py-2 text-sm font-mono border 
              ${darkMode ? 'border-gray-700 bg-[#202020] text-white' : 'border-black bg-white text-black'}`}
            >
              {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
            <button
              onClick={handleDisconnect}
              className={`cursor-target flex h-10 items-center gap-2 px-4 py-2 border transition-colors ${darkMode ? 'border-gray-700 bg-[#202020] hover:bg-[#FF5A60] text-white' : 'border-black bg-white hover:bg-[#FF5A60] text-black'}`}
            >Disconnect</button>
          </div>
        ) : (
          <button
            onClick={handleConnect}
            className={`cursor-target flex h-10 items-center gap-2 px-4 py-2 border transition-colors ${darkMode ? 'border-gray-700 bg-[#202020] hover:bg-[#64FFC2] text-white' : 'border-black bg-white hover:bg-[#64FFC2] text-black'}`}
          >Connect</button>
        )}
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <button
              className={`cursor-target p-2 border transition-colors 
                ${darkMode ? 'border-gray-700 bg-[#202020] text-white' : 'border-black bg-white text-black'}`}
            >
              <Menu className="w-6 h-6" />
            </button>
          </SheetTrigger>

          <SheetContent
            side="right"
            className={`cursor-target w-[280px] sm:w-[320px] border-l 
              ${darkMode ? 'bg-[#0E0E0E] border-gray-800 text-white' : 'bg-white border-black text-black'}`}
          >
            <div className="mx-2 flex flex-col gap-4 mt-16">
              <button
                onClick={handleHome}
                className={`cursor-target flex h-10 w-full items-center justify-center px-4 border transition-colors 
                  ${darkMode ? 'border-gray-700 bg-[#202020] text-white hover:bg-gray-700' : 'border-black bg-white text-black hover:bg-gray-200'}`}
              >
                Home
              </button>

              <button
                onClick={handleBridge}
                className={`cursor-target flex h-10 w-full items-center justify-center px-4 border transition-colors 
                  ${darkMode ? 'border-gray-700 bg-[#202020] text-white hover:bg-gray-700' : 'border-black bg-white text-black hover:bg-gray-200'}`}
              >
                <LinkIcon className="w-4 h-4 mr-1" /> Bridge
              </button>

              <button
                onClick={handleAddChain}
                className={`flex h-10 w-full items-center justify-center px-4 border transition-colors 
                  ${darkMode ? 'border-gray-700 bg-[#202020] text-white hover:bg-gray-700' : 'border-black bg-white text-black hover:bg-gray-200'}`}
              >
                Add Chain
              </button>

              <div className="pt-4 border-t border-gray-400">
                {connectedWallet ? (
                  <div className="flex flex-col gap-3">
                    <div className={`cursor-target flex h-10 w-full items-center justify-center px-4 border text-sm font-mono 
                      ${darkMode ? 'border-gray-700 bg-[#202020] text-white' : 'border-black bg-white text-black'}`}
                    >
                      {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
                    </div>
                    <button
                      onClick={handleDisconnect}
                      className={`cursor-target flex h-10 w-full items-center justify-center gap-2 px-4 border transition-colors ${darkMode ? 'border-gray-700 bg-[#202020] hover:bg-[#FF5A60] text-white' : 'border-black bg-white hover:bg-[#FF5A60] text-black'}`}
                      >Disconnect Wallet</button>
                  </div>
                ) : (
                  <button
                    onClick={handleConnect}
                    className={`cursor-target flex h-10 w-full items-center justify-center gap-2 px-4 border transition-colors ${darkMode ? 'border-gray-700 bg-[#202020] hover:bg-[#64FFC2] text-white' : 'border-black bg-white hover:bg-[#64FFC2] text-black'}`}
                  >Connect Wallet</button>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}