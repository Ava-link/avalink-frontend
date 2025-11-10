'use client';

import React, { useState } from 'react';
import { ArrowLeft, X, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../providers/WalletProvider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

interface HomeChainFormData {
  rpcUrl: string;
  blockchainId: string;
  tokenAddress: string;
  tokenDecimals: string;
  teleporterManagerAddress: string;
  minTeleporterVersion: string;
  teleporterRegistryDeploy: boolean;
  teleporterRegistryAddress: string;
}

interface RemoteChainFormData {
  rpcUrl: string;
  blockchainId: string;
  teleporterManagerAddress: string;
  minTeleporterVersion: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: string;
  initialReserveImbalance: string;
  teleporterRegistryDeploy: boolean;
  teleporterRegistryAddress: string;
}

const TELEPORTER_MESSENGER_ADDRESS = '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf';

export default function AddChainPage() {
  const router = useRouter();
  const { darkMode } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [homeChainHasICMSetup, setHomeChainHasICMSetup] = useState<boolean>(false);
  const [remoteChainHasICMSetup, setRemoteChainHasICMSetup] = useState<boolean>(false);
  const [bridgeType, setBridgeType] = useState<'erc20-erc20' | 'erc20-native' | 'native-erc20' | 'native-native'>('erc20-erc20');
  const bridgeTypeOptions: { value: 'erc20-erc20' | 'erc20-native' | 'native-erc20' | 'native-native'; label: string }[] = [
    { value: 'erc20-erc20', label: 'ERC-20 to ERC-20' },
    { value: 'erc20-native', label: 'ERC-20 to Native' },
    { value: 'native-erc20', label: 'Native to ERC-20' },
    { value: 'native-native', label: 'Native to Native' },
  ];
  const [homeChain, setHomeChain] = useState<HomeChainFormData>({
    rpcUrl: '',
    blockchainId: '',
    tokenAddress: '',
    tokenDecimals: '18',
    teleporterManagerAddress: '',
    minTeleporterVersion: '1',
    teleporterRegistryDeploy: false,
    teleporterRegistryAddress: '',
  });

  const [remoteChain, setRemoteChain] = useState<RemoteChainFormData>({
    rpcUrl: '',
    blockchainId: '',
    teleporterManagerAddress: '',
    minTeleporterVersion: '1',
    tokenName: '',
    tokenSymbol: '',
    tokenDecimals: '18',
    initialReserveImbalance: '0',
    teleporterRegistryDeploy: false,
    teleporterRegistryAddress: '',
  });

  const handleHomeChainInputChange = (field: keyof HomeChainFormData, value: string | boolean) => {
    setHomeChain(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleRemoteChainInputChange = (field: keyof RemoteChainFormData, value: string | boolean) => {
    setRemoteChain(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHomeChainICMSetupChange = (checked: boolean) => {
    setHomeChainHasICMSetup(checked);
    
    if (checked) {
      // If yes (checked), set deploy to false - user will provide contract addresses
      setHomeChain(prev => ({
        ...prev,
        teleporterRegistryDeploy: false,
      }));
    } else {
      // If no (unchecked), set deploy to true - contracts will be deployed
      setHomeChain(prev => ({
        ...prev,
        teleporterRegistryDeploy: true,
      }));
    }
  };

  const handleRemoteChainICMSetupChange = (checked: boolean) => {
    setRemoteChainHasICMSetup(checked);
    
    if (checked) {
      // If yes (checked), set deploy to false - user will provide contract addresses
      setRemoteChain(prev => ({
        ...prev,
        teleporterRegistryDeploy: false,
      }));
    } else {
      // If no (unchecked), set deploy to true - contracts will be deployed
      setRemoteChain(prev => ({
        ...prev,
        teleporterRegistryDeploy: true,
      }));
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
      // Prepare request body matching the curl structure
      const requestBody = {
        homeChain: {
          rpcUrl: homeChain.rpcUrl,
          blockchainId: homeChain.blockchainId,
          tokenAddress: homeChain.tokenAddress,
          tokenDecimals: parseInt(homeChain.tokenDecimals),
          teleporterManagerAddress: homeChain.teleporterManagerAddress,
          minTeleporterVersion: parseInt(homeChain.minTeleporterVersion),
          teleporterMessenger: {
            deploy: false,
            contractAddress: TELEPORTER_MESSENGER_ADDRESS,
          },
          teleporterRegistry: {
            deploy: homeChain.teleporterRegistryDeploy,
            contractAddress: homeChain.teleporterRegistryAddress,
          },
        },
        remoteChain: {
          rpcUrl: remoteChain.rpcUrl,
          blockchainId: remoteChain.blockchainId,
          teleporterManagerAddress: remoteChain.teleporterManagerAddress,
          minTeleporterVersion: parseInt(remoteChain.minTeleporterVersion),
          tokenName: remoteChain.tokenName,
          tokenSymbol: remoteChain.tokenSymbol,
          tokenDecimals: parseInt(remoteChain.tokenDecimals),
          initialReserveImbalance: parseInt(remoteChain.initialReserveImbalance),
          teleporterMessenger: {
            deploy: false,
            contractAddress: TELEPORTER_MESSENGER_ADDRESS,
          },
          teleporterRegistry: {
            deploy: remoteChain.teleporterRegistryDeploy,
            contractAddress: remoteChain.teleporterRegistryAddress,
          },
        },
      };

      // Send PUT request to API
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
      const response = await fetch(`${backendUrl}/deploy/bridge`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      await response.json();
      showToastMessage('Bridge deployment initiated successfully!');
      
      // Reset form
      setHomeChain({
        rpcUrl: '',
        blockchainId: '',
        tokenAddress: '',
        tokenDecimals: '18',
        teleporterManagerAddress: '',
        minTeleporterVersion: '1',
        teleporterRegistryDeploy: false,
        teleporterRegistryAddress: '',
      });
      
      setRemoteChain({
        rpcUrl: '',
        blockchainId: '',
        teleporterManagerAddress: '',
        minTeleporterVersion: '1',
        tokenName: '',
        tokenSymbol: '',
        tokenDecimals: '18',
        initialReserveImbalance: '0',
        teleporterRegistryDeploy: false,
        teleporterRegistryAddress: '',
      });
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        router.push('/');
      }, 2000);
      
    } catch (error) {
      console.error('Error deploying bridge:', error);
      showToastMessage(error instanceof Error ? error.message : 'Error deploying bridge. Please try again.');
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <h1 className={`text-4xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              Deploy Bridge
            </h1>
          </div>
          <p className={`text-lg ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Configure and deploy a bridge between home and remote chains
          </p>
        </div>

        <div className='mb-4 space-y-3'>
          <div className="md:hidden">
            <Select
              value={bridgeType}
              onValueChange={(value) => setBridgeType(value as typeof bridgeType)}
            >
              <SelectTrigger
                className={`w-full ${darkMode ? 'bg-gray-900/60 border-gray-700 text-white hover:bg-gray-900' : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'}`}
              >
                <SelectValue placeholder="Select bridge type" />
              </SelectTrigger>
              <SelectContent
                className={`${darkMode ? 'bg-gray-900 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-200'}`}
              >
                {bridgeTypeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="hidden md:block">
            <Tabs
              value={bridgeType}
              onValueChange={(value) => setBridgeType(value as typeof bridgeType)}
              className="w-full md:w-auto"
              darkMode={darkMode}
            >
              <TabsList
                className="grid w-full grid-cols-2 gap-2 md:flex md:w-auto md:items-center md:justify-center md:space-x-2 md:gap-0"
              >
                {bridgeTypeOptions.map((option) => (
                  <TabsTrigger key={option.value} value={option.value}>
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </div>

        {bridgeType === 'erc20-erc20' ? (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Home Chain Configuration Card */}
          <div className={`${darkMode ? 'bg-gray-900/50 border-gray-800/50' : 'bg-white/50 border-gray-200'} backdrop-blur-xl rounded-3xl border p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Home Chain Configuration
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  RPC URL *
                </label>
                <input
                  type="url"
                  required
                  value={homeChain.rpcUrl}
                  onChange={(e) => handleHomeChainInputChange('rpcUrl', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="https://api.avax-test.network/ext/bc/C/rpc"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Blockchain ID *
                </label>
                <input
                  type="text"
                  required
                  value={homeChain.blockchainId}
                  onChange={(e) => handleHomeChainInputChange('blockchainId', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Teleporter Manager Address *
                </label>
                <input
                  type="text"
                  required
                  value={homeChain.teleporterManagerAddress}
                  onChange={(e) => handleHomeChainInputChange('teleporterManagerAddress', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="0x50B2Ca22c3093fddA77b504960A9e9b7146e3cc1"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Min Teleporter Version *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={homeChain.minTeleporterVersion}
                  onChange={(e) => handleHomeChainInputChange('minTeleporterVersion', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Token Configuration */}
            <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                Token Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Token Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={homeChain.tokenAddress}
                    onChange={(e) => handleHomeChainInputChange('tokenAddress', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="0x9dafF7B0c496591CC20Af1D8394FF1cB8696c9a7"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Token Decimals *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="18"
                    value={homeChain.tokenDecimals}
                    onChange={(e) => handleHomeChainInputChange('tokenDecimals', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="18"
                  />
                </div>
              </div>
            </div>

            {/* Teleporter Registry Configuration */}
            <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Switch
                  id="home_icm_setup"
                  checked={homeChainHasICMSetup}
                  onCheckedChange={handleHomeChainICMSetupChange}
                  className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-700/80"
                />
                <label htmlFor="home_icm_setup" className={`text-sm font-medium cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Does your chain have a ICM setup?
                </label>
              </div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                Teleporter Registry
              </h3>
              {!homeChainHasICMSetup && (
                <div className="flex items-center gap-3 mb-4">
                  <Switch
                    id="home_teleporter_registry_deploy"
                    checked={homeChain.teleporterRegistryDeploy}
                    onCheckedChange={(checked) => handleHomeChainInputChange('teleporterRegistryDeploy', checked)}
                    disabled
                    className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-700/60 disabled:opacity-60"
                  />
                  <label htmlFor="home_teleporter_registry_deploy" className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Deploy Teleporter Registry
                  </label>
                </div>
              )}
              {homeChainHasICMSetup && (
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Contract Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={homeChain.teleporterRegistryAddress}
                    onChange={(e) => handleHomeChainInputChange('teleporterRegistryAddress', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Remote Chain Configuration Card */}
          <div className={`${darkMode ? 'bg-gray-900/50 border-gray-800/50' : 'bg-white/50 border-gray-200'} backdrop-blur-xl rounded-3xl border p-6 shadow-2xl`}>
            <div className="flex items-center justify-between mb-6">
              <h2 className={`text-2xl font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                Remote Chain Configuration
              </h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="md:col-span-2">
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  RPC URL *
                </label>
                <input
                  type="url"
                  required
                  value={remoteChain.rpcUrl}
                  onChange={(e) => handleRemoteChainInputChange('rpcUrl', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="https://subnets.avax.network/dispatch/testnet/rpc"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Blockchain ID *
                </label>
                <input
                  type="text"
                  required
                  value={remoteChain.blockchainId}
                  onChange={(e) => handleRemoteChainInputChange('blockchainId', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="0x9f49313c3f022e9fe5b6e7c1d98f0f53d86e53456c5e075e1881cac1c15968e4"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Teleporter Manager Address *
                </label>
                <input
                  type="text"
                  required
                  value={remoteChain.teleporterManagerAddress}
                  onChange={(e) => handleRemoteChainInputChange('teleporterManagerAddress', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="0x50B2Ca22c3093fddA77b504960A9e9b7146e3cc1"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                  Min Teleporter Version *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  value={remoteChain.minTeleporterVersion}
                  onChange={(e) => handleRemoteChainInputChange('minTeleporterVersion', e.target.value)}
                  className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                  placeholder="1"
                />
              </div>
            </div>

            {/* Token Configuration */}
            <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                Token Configuration
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Token Name *
                    <div className="relative group">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className={`relative ${darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-900 text-white border-gray-600'} text-xs rounded-lg px-3 py-2 shadow-lg border whitespace-nowrap`}>
                          What should be your wrapped token name on your chain. Example: Wrapped Avax
                          <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 ${darkMode ? 'border-t-gray-800' : 'border-t-gray-900'} border-l-transparent border-r-transparent border-b-transparent border-4`}></div>
                        </div>
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    value={remoteChain.tokenName}
                    onChange={(e) => handleRemoteChainInputChange('tokenName', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="Wrapped Avax"
                  />
                </div>

                <div>
                  <label className={`flex items-center gap-2 text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Token Symbol * 
                    <div className="relative group">
                      <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className={`relative ${darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-gray-900 text-white border-gray-600'} text-xs rounded-lg px-3 py-2 shadow-lg border whitespace-nowrap`}>
                          What should be your wrapped token symbol on your chain. Example: WAVAX
                          <div className={`absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 ${darkMode ? 'border-t-gray-800' : 'border-t-gray-900'} border-l-transparent border-r-transparent border-b-transparent border-4`}></div>
                        </div>
                      </div>
                    </div>
                  </label>
                  <input
                    type="text"
                    required
                    value={remoteChain.tokenSymbol}
                    onChange={(e) => handleRemoteChainInputChange('tokenSymbol', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="WAVAX"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Token Decimals *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    max="18"
                    value={remoteChain.tokenDecimals}
                    onChange={(e) => handleRemoteChainInputChange('tokenDecimals', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="18"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Initial Reserve Imbalance *
                  </label>
                  <input
                    type="number"
                    required
                    value={remoteChain.initialReserveImbalance}
                    onChange={(e) => handleRemoteChainInputChange('initialReserveImbalance', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Teleporter Registry Configuration */}
            <div className={`mt-6 pt-6 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
              <div className="flex items-center gap-3 mb-4">
                <Switch
                  id="remote_icm_setup"
                  checked={remoteChainHasICMSetup}
                  onCheckedChange={handleRemoteChainICMSetupChange}
                  className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-700/80"
                />
                <label htmlFor="remote_icm_setup" className={`text-sm font-medium cursor-pointer ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  Does your chain have a ICM setup?
                </label>
              </div>
              <h3 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'} mb-4`}>
                Teleporter Registry
              </h3>
              {!remoteChainHasICMSetup && (
                <div className="flex items-center gap-3 mb-4">
                  <Switch
                    id="remote_teleporter_registry_deploy"
                    checked={remoteChain.teleporterRegistryDeploy}
                    onCheckedChange={(checked) => handleRemoteChainInputChange('teleporterRegistryDeploy', checked)}
                    disabled
                    className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-700/60 disabled:opacity-60"
                  />
                  <label htmlFor="remote_teleporter_registry_deploy" className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    Deploy Teleporter Registry
                  </label>
                </div>
              )}
              {remoteChainHasICMSetup && (
                <div>
                  <label className={`block text-sm font-medium ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
                    Contract Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={remoteChain.teleporterRegistryAddress}
                    onChange={(e) => handleRemoteChainInputChange('teleporterRegistryAddress', e.target.value)}
                    className={`w-full px-4 py-3 ${darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-gray-300'} border rounded-2xl focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all`}
                    placeholder="0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
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
                  Deploying...
                </>
              ) : (
                <>
                  {/* <Save className="w-5 h-5" /> */}
                  Deploy Bridge
                </>
              )}
            </button>
          </div>
        </form>
        ) : (
          <div className={`flex flex-col items-center justify-center gap-4 py-24 rounded-3xl border ${darkMode ? 'border-gray-800/50 bg-gray-900/30 text-gray-400' : 'border-gray-200 bg-gray-50 text-gray-600'} transition-colors`}>
            <div id="computer" className="w-full max-w-[340px] mx-auto">
              <span className="computer-graphic" />
            </div>
            <p className="text-4xl font-semibold">Coming soon...</p>
            <p className="text-sm">This bridge configuration is under development.</p>
          </div>
        )}
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
