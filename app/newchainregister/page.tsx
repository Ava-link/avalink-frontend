'use client';

import React, { useState } from 'react';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ethers } from 'ethers';
import { useWallet } from '../providers/WalletProvider';
import { supabase, Chain, Token } from '@/lib/supabase';
import ERC20TokenRemoteABI from '@/abi/ERC20TokenRemote.json';

// Type for the ABI
interface ContractABI {
  abi: ethers.InterfaceAbi;
}

// Extend Window interface to include ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      send: (method: string, params?: unknown[]) => Promise<unknown>;
    };
  }
}

interface ChainFormData {
  chain_id: string;
  chain_name: string;
  blockchain_id_hex: string;
  native_token: string;
  rpc_url: string;
  has_teleporters: boolean;
  teleporter_address: string;
  teleporter_registry_address: string;
}

interface TokenFormData {
  address: string;
  type: 'ERC20' | 'NATIVE' | 'BRIDGED';
  name: string;
  symbol: string;
  decimals: string;
}

export default function NewChainRegisterPage() {
  const router = useRouter();
  const { darkMode, signer: ctxSigner } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [signer, setSigner] = useState<ethers.JsonRpcSigner | null>(null);
  const [chainData, setChainData] = useState<ChainFormData>({
    chain_id: '',
    chain_name: '',
    blockchain_id_hex: '',
    native_token: '',
    rpc_url: '',
    has_teleporters: false,
    teleporter_address: '',
    teleporter_registry_address: '',
  });

  const [tokens, setTokens] = useState<TokenFormData[]>([
    {
      address: '',
      type: 'NATIVE',
      name: '',
      symbol: '',
      decimals: '18',
    }
  ]);

  const contractAddress = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS

  // Use signer from context
  React.useEffect(() => {
    if (ctxSigner) setSigner(ctxSigner);
  }, [ctxSigner]);

  const registerWithHome = async () => {
    if (!signer || !contractAddress) {
      showToastMessage('Please connect your wallet first.');
      return;
    }

    setIsVerifying(true);

    try {
      const contract = new ethers.Contract(contractAddress, (ERC20TokenRemoteABI as ContractABI).abi, signer);
      
      // Prepare fee info - using zero fee for now
      const feeInfo = {
        feeTokenAddress: ethers.ZeroAddress, // Using zero address for no fee
        amount: 0 // Zero amount
      };

      // Call registerWithHome function
      const tx = await contract.registerWithHome(feeInfo);
      
      showToastMessage('Transaction sent! Waiting for confirmation...');
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        showToastMessage('Chain registered with home successfully!');
      } else {
        throw new Error('Transaction failed');
      }
    } catch (error) {
      console.error('Error calling registerWithHome:', error);
      showToastMessage(error instanceof Error ? error.message : 'Failed to register with home. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleChainInputChange = (field: keyof ChainFormData, value: string | boolean) => {
    setChainData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleTokenInputChange = (index: number, field: keyof TokenFormData, value: string) => {
    setTokens(prev => prev.map((token, i) => 
      i === index ? { ...token, [field]: value } : token
    ));
  };

  const addToken = () => {
    setTokens(prev => [...prev, {
      address: '',
      type: 'ERC20',
      name: '',
      symbol: '',
      decimals: '18',
    }]);
  };

  const removeToken = (index: number) => {
    if (tokens.length > 1) {
      setTokens(prev => prev.filter((_, i) => i !== index));
    }
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Prepare chain data for Supabase
      const chainRecord: Omit<Chain, 'id' | 'created_at' | 'updated_at'> = {
        chain_id: parseInt(chainData.chain_id),
        chain_name: chainData.chain_name,
        blockchain_id_hex: chainData.blockchain_id_hex || undefined,
        native_token: chainData.native_token || undefined,
        rpc_url: chainData.rpc_url,
        has_teleporters: chainData.has_teleporters,
        teleporter_address: chainData.teleporter_address || undefined,
        teleporter_registry_address: chainData.teleporter_registry_address || undefined,
      };

      // Insert chain into database
      const { error: chainError } = await supabase
        .from('chains')
        .insert([chainRecord])
        .select()
        .single();

      if (chainError) {
        throw new Error(`Failed to insert chain: ${chainError.message}`);
      }

      // Prepare tokens data for Supabase
      const tokenRecords: Omit<Token, 'id' | 'created_at' | 'updated_at'>[] = tokens.map(token => ({
        chain_id: parseInt(chainData.chain_id),
        address: token.address,
        type: token.type,
        name: token.name,
        symbol: token.symbol,
        decimals: parseInt(token.decimals),
      }));

      // Insert tokens into database
      const { error: tokensError } = await supabase
        .from('tokens')
        .insert(tokenRecords);

      if (tokensError) {
        // If tokens insertion fails, we should also remove the chain
        await supabase
          .from('chains')
          .delete()
          .eq('chain_id', parseInt(chainData.chain_id));
        
        throw new Error(`Failed to insert tokens: ${tokensError.message}`);
      }

      showToastMessage('Chain registered successfully!');
      
      // Reset form
      setChainData({
        chain_id: '',
        chain_name: '',
        blockchain_id_hex: '',
        native_token: '',
        rpc_url: '',
        has_teleporters: false,
        teleporter_address: '',
        teleporter_registry_address: '',
      });
      
      setTokens([{
        address: '',
        type: 'NATIVE',
        name: '',
        symbol: '',
        decimals: '18',
      }]);
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error registering chain:', error);
      showToastMessage(error instanceof Error ? error.message : 'Error registering chain. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // darkMode and toggleDarkMode are provided by context in layout

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-950' : 'bg-white'} transition-colors duration-300`}>
      {/* Header is provided globally from layout */}

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Back Button */}
        <button
          onClick={() => router.back()}
          className={`flex items-center gap-2 mb-6 ${darkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'} transition-colors`}
        >
          <ArrowLeft className="w-5 h-5" />
          Back
        </button>

        {/* Page Title */}
        <div className="mb-8">
          <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'} mb-2`}>
            Register New Chain
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Add a new blockchain to the Avalink bridge network
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Chain Information Card */}
          <div className={`bg-${darkMode ? 'gray-900/50' : 'white/50'} backdrop-blur-xl rounded-3xl border ${darkMode ? 'border-gray-800/50' : 'border-gray-200'} p-6 shadow-2xl`}>
            <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-6`}>
              Chain Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Chain ID *
                </label>
                <input
                  type="number"
                  required
                  value={chainData.chain_id}
                  onChange={(e) => handleChainInputChange('chain_id', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="e.g., 43114"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Chain Name *
                </label>
                <input
                  type="text"
                  required
                  value={chainData.chain_name}
                  onChange={(e) => handleChainInputChange('chain_name', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="e.g., Avalanche C-Chain"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Blockchain ID (Hex)
                </label>
                <input
                  type="text"
                  value={chainData.blockchain_id_hex}
                  onChange={(e) => handleChainInputChange('blockchain_id_hex', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="e.g., 0x0000000000000000000000000000000000000000000000000000000000000000"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Native Token
                </label>
                <input
                  type="text"
                  value={chainData.native_token}
                  onChange={(e) => handleChainInputChange('native_token', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="e.g., AVAX"
                />
              </div>

              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  RPC URL *
                </label>
                <input
                  type="url"
                  required
                  value={chainData.rpc_url}
                  onChange={(e) => handleChainInputChange('rpc_url', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="https://api.avax.network/ext/bc/C/rpc"
                />
              </div>
            </div>

            {/* Teleporter Configuration */}
            <div className="mt-6 pt-6 border-t border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="checkbox"
                  id="has_teleporters"
                  checked={chainData.has_teleporters}
                  onChange={(e) => handleChainInputChange('has_teleporters', e.target.checked)}
                  className="w-5 h-5 text-red-500 bg-gray-800 border-gray-600 rounded focus:ring-red-500"
                />
                <label htmlFor="has_teleporters" className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Has Teleporters
                </label>
              </div>

              {chainData.has_teleporters && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Teleporter Address
                    </label>
                    <input
                      type="text"
                      value={chainData.teleporter_address}
                      onChange={(e) => handleChainInputChange('teleporter_address', e.target.value)}
                      className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                      placeholder="0x..."
                    />
                  </div>

                  <div>
                    <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                      Teleporter Registry Address
                    </label>
                    <input
                      type="text"
                      value={chainData.teleporter_registry_address}
                      onChange={(e) => handleChainInputChange('teleporter_registry_address', e.target.value)}
                      className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                      placeholder="0x..."
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tokens Configuration Card */}
          <div className={`bg-${darkMode ? 'gray-900/50' : 'white/50'} backdrop-blur-xl rounded-3xl border ${darkMode ? 'border-gray-800/50' : 'border-gray-200'} p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Tokens Configuration
              </h2>
              <button
                type="button"
                onClick={addToken}
                className={`flex items-center gap-2 px-4 py-2 ${darkMode ? 'bg-gray-800/50 hover:bg-gray-700' : 'bg-gray-200 hover:bg-gray-300'} rounded-xl transition-colors`}
              >
                <Plus className="w-4 h-4" />
                <span className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>Add Token</span>
              </button>
            </div>

            <div className="space-y-6">
              {tokens.map((token, index) => (
                <div key={index} className={`p-4 ${darkMode ? 'bg-gray-800/30' : 'bg-gray-100/50'} rounded-2xl border ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={`text-lg font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      Token {index + 1}
                    </h3>
                    {tokens.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeToken(index)}
                        className={`p-2 ${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'} rounded-xl transition-colors`}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Address *
                      </label>
                      <input
                        type="text"
                        required
                        value={token.address}
                        onChange={(e) => handleTokenInputChange(index, 'address', e.target.value)}
                        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                        placeholder="0x..."
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Type *
                      </label>
                      <select
                        value={token.type}
                        onChange={(e) => handleTokenInputChange(index, 'type', e.target.value as 'ERC20' | 'NATIVE' | 'BRIDGED')}
                        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                      >
                        <option value="NATIVE">Native</option>
                        <option value="ERC20">ERC20</option>
                        <option value="BRIDGED">Bridged</option>
                      </select>
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={token.name}
                        onChange={(e) => handleTokenInputChange(index, 'name', e.target.value)}
                        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                        placeholder="e.g., USD Coin"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Symbol *
                      </label>
                      <input
                        type="text"
                        required
                        value={token.symbol}
                        onChange={(e) => handleTokenInputChange(index, 'symbol', e.target.value)}
                        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                        placeholder="e.g., USDC"
                      />
                    </div>

                    <div>
                      <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                        Decimals *
                      </label>
                      <input
                        type="number"
                        required
                        min="0"
                        max="18"
                        value={token.decimals}
                        onChange={(e) => handleTokenInputChange(index, 'decimals', e.target.value)}
                        className={`w-full px-3 py-2 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                        placeholder="18"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={registerWithHome}
              disabled={isVerifying || !signer}
              className={`flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-2xl font-semibold text-lg transition-all shadow-lg ${
                isVerifying || !signer ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isVerifying ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Verifying...
                </>
              ) : !signer ? (
                <>
                  Connect Wallet First
                </>
              ) : (
                <>
                  {/* <Save className="w-5 h-5" /> */}
                  Verify
                </>
              )}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-500 disabled:to-gray-600 text-white rounded-2xl font-semibold text-lg transition-all shadow-lg ${
                isSubmitting ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Registering...
                </>
              ) : (
                <>
                  {/* <Save className="w-5 h-5" /> */}
                  Register Chain
                </>
              )}
            </button>
          </div>
        </form>
      </main>

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-4 right-4 bg-gray-800 text-white px-6 py-3 rounded-xl shadow-lg z-50 flex items-center gap-2">
          <span>{toastMessage}</span>
          <button onClick={() => setShowToast(false)} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
