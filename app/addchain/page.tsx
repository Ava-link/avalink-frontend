'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, X, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useWallet } from '../providers/WalletProvider';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { cn } from "@/lib/utils";
import { Orbitron } from "next/font/google";

const orbitron = Orbitron({ subsets: ["latin"], weight: ["400","700"] });
interface HomeChainFormData {
  rpcUrl: string;
  blockchainId: string;
  tokenAddress: string;
  tokenDecimals: string;
  teleporterRegistryDeploy: boolean;
  teleporterRegistryAddress: string;
}

interface RemoteChainFormData {
  rpcUrl: string;
  blockchainId: string;
  tokenName: string;
  tokenSymbol: string;
  tokenDecimals: string;
  teleporterRegistryDeploy: boolean;
  teleporterRegistryAddress: string;
}

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

const TELEPORTER_MESSENGER_ADDRESS = '0x253b2784c75e510dD0fF1da844684a1aC0aa5fcf';

export default function AddChainPage() {
  const router = useRouter();
  const { darkMode } = useWallet();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [homeChainHasICMSetup, setHomeChainHasICMSetup] = useState<boolean>(true);
  const [remoteChainHasICMSetup, setRemoteChainHasICMSetup] = useState<boolean>(true);
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
    teleporterRegistryDeploy: false,
    teleporterRegistryAddress: '',
  });

  const [remoteChain, setRemoteChain] = useState<RemoteChainFormData>({
    rpcUrl: '',
    blockchainId: '',
    tokenName: '',
    tokenSymbol: '',
    tokenDecimals: '18',
    teleporterRegistryDeploy: false,
    teleporterRegistryAddress: '',
  });

  const [availableChains, setAvailableChains] = useState<ChainInfo[]>([]);
  const [selectedHomeChainId, setSelectedHomeChainId] = useState<string>('__custom');
  const [selectedRemoteChainId, setSelectedRemoteChainId] = useState<string>('__custom');
  const [homeChainDisabledFields, setHomeChainDisabledFields] = useState<Partial<Record<keyof HomeChainFormData, boolean>>>(
    {}
  );
  const [remoteChainDisabledFields, setRemoteChainDisabledFields] = useState<Partial<Record<keyof RemoteChainFormData, boolean>>>(
    {}
  );
  const [homeChainICMDisabled, setHomeChainICMDisabled] = useState(false);
  const [remoteChainICMDisabled, setRemoteChainICMDisabled] = useState(false);
  const [chainsLoading, setChainsLoading] = useState(false);
  const [chainsError, setChainsError] = useState<string | null>(null);

  const teleporter_manager_address =
    process.env.NEXT_PUBLIC_TELEPORTER_MANAGER_ADDRESS;

  useEffect(() => {
    const fetchChains = async () => {
      setChainsLoading(true);
      setChainsError(null);
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
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
          setAvailableChains(data.chain);
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

  const handleHomeChainInputChange = (field: keyof HomeChainFormData, value: string | boolean) => {
    setHomeChain(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleHomeChainSelect = (chainId: string) => {
    if (chainId === '__custom') {
      setSelectedHomeChainId('__custom');
      setHomeChainDisabledFields({});
      setHomeChainICMDisabled(false);
      setHomeChain(prev => ({
        ...prev,
        teleporterRegistryDeploy: false,
      }));
      return;
    }

    setSelectedHomeChainId(chainId);

    if (selectedRemoteChainId === chainId) {
      handleRemoteChainSelect('__custom');
    }

    const selectedChain = availableChains.find(chain => chain.id === chainId);
    if (!selectedChain) {
      setHomeChainDisabledFields({});
      setHomeChainICMDisabled(false);
      return;
    }

    setHomeChain(prev => {
      const updated = { ...prev };
      const disabled: Partial<Record<keyof HomeChainFormData, boolean>> = {};

      if (selectedChain.rpcUrl) {
        updated.rpcUrl = selectedChain.rpcUrl;
        disabled.rpcUrl = true;
      } else {
        disabled.rpcUrl = false;
      }

      if (selectedChain.blockchainId) {
        updated.blockchainId = selectedChain.blockchainId;
        disabled.blockchainId = true;
      } else {
        disabled.blockchainId = false;
      }

      if (selectedChain.teleporterRegistryAddress) {
        updated.teleporterRegistryAddress = selectedChain.teleporterRegistryAddress;
        disabled.teleporterRegistryAddress = true;
      } else {
        disabled.teleporterRegistryAddress = false;
      }

      setHomeChainDisabledFields(disabled);
      return updated;
    });

    if (typeof selectedChain.hasIcmEnabled === 'boolean') {
      setHomeChainHasICMSetup(selectedChain.hasIcmEnabled);
      setHomeChainICMDisabled(true);
      setHomeChain(prev => ({
        ...prev,
        teleporterRegistryDeploy: !selectedChain.hasIcmEnabled,
      }));
    } else {
      setHomeChainICMDisabled(false);
    }
  };

  const handleRemoteChainSelect = (chainId: string) => {
    if (chainId === '__custom') {
      setSelectedRemoteChainId('__custom');
      setRemoteChainDisabledFields({});
      setRemoteChainICMDisabled(false);
      setRemoteChain(prev => ({
        ...prev,
        rpcUrl: '',
        blockchainId: '',
        tokenName: '',
        tokenSymbol: '',
        teleporterRegistryAddress: '',
        teleporterRegistryDeploy: false,
      }));
      return;
    }

    setSelectedRemoteChainId(chainId);

    const selectedChain = availableChains.find(chain => chain.id === chainId);
    if (!selectedChain) {
      setRemoteChainDisabledFields({});
      setRemoteChainICMDisabled(false);
      return;
    }

    setRemoteChain(prev => {
      const updated = { ...prev };
      const disabled: Partial<Record<keyof RemoteChainFormData, boolean>> = {};

      if (selectedChain.rpcUrl) {
        updated.rpcUrl = selectedChain.rpcUrl;
        disabled.rpcUrl = true;
      } else {
        updated.rpcUrl = '';
        disabled.rpcUrl = false;
      }

      if (selectedChain.blockchainId) {
        updated.blockchainId = selectedChain.blockchainId;
        disabled.blockchainId = true;
      } else {
        updated.blockchainId = '';
        disabled.blockchainId = false;
      }

      if (selectedChain.teleporterRegistryAddress) {
        updated.teleporterRegistryAddress = selectedChain.teleporterRegistryAddress;
        disabled.teleporterRegistryAddress = true;
      } else {
        updated.teleporterRegistryAddress = '';
        disabled.teleporterRegistryAddress = false;
      }

      updated.tokenName = '';
      disabled.tokenName = false;

      updated.tokenSymbol = '';
      disabled.tokenSymbol = false;

      setRemoteChainDisabledFields(disabled);
      return updated;
    });

    if (typeof selectedChain.hasIcmEnabled === 'boolean') {
      setRemoteChainHasICMSetup(selectedChain.hasIcmEnabled);
      setRemoteChainICMDisabled(true);
      setRemoteChain(prev => ({
        ...prev,
        teleporterRegistryDeploy: !selectedChain.hasIcmEnabled,
      }));
    } else {
      setRemoteChainICMDisabled(false);
    }
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
          teleporterManagerAddress: teleporter_manager_address,
          minTeleporterVersion: 1,
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
          teleporterManagerAddress: teleporter_manager_address,
          minTeleporterVersion: 1,
          tokenName: remoteChain.tokenName,
          tokenSymbol: remoteChain.tokenSymbol,
          tokenDecimals: parseInt(remoteChain.tokenDecimals),
          initialReserveImbalance: 0,
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
        teleporterRegistryDeploy: false,
        teleporterRegistryAddress: '',
      });
      
      setRemoteChain({
        rpcUrl: '',
        blockchainId: '',
        tokenName: '',
        tokenSymbol: '',
        tokenDecimals: '18',
        teleporterRegistryDeploy: false,
        teleporterRegistryAddress: '',
      });
      setHomeChainHasICMSetup(true);
      setRemoteChainHasICMSetup(true);
      
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
    <div className={cn("min-h-screen w-full transition-colors duration-300 p-2 md:p-4", orbitron.className, darkMode ? 'bg-[#0e0e0e] text-white' : 'bg-[#f2f2f2] text-black')}>
      <div className="grid grid-cols-1 gap-2">
        
        {/* Page Title Block */}
        <section className={cn("border p-6", darkMode ? 'border-gray-700' : 'border-black')}>
          <h1 className="text-4xl md:text-5xl font-bold tracking-wide mb-2">
            DEPLOY BRIDGE
          </h1>
          <p className={cn("text-sm tracking-widest", darkMode ? 'text-gray-400' : 'text-gray-600')}>
            CONFIGURE AND DEPLOY A BRIDGE BETWEEN HOME AND REMOTE CHAINS
          </p>
        </section>
  
        {/* Bridge Type Selection Block */}
        <section className={cn("border p-6", darkMode ? 'border-gray-700' : 'border-black')}>
          <div className="mb-4">
            <h3 className={cn("text-xs tracking-widest mb-3", darkMode ? 'text-gray-400' : 'text-gray-600')}>
              BRIDGE TYPE
            </h3>
          </div>
          
          <div className='space-y-3'>
            <div className="md:hidden">
              <Select
                value={bridgeType}
                onValueChange={(value) => setBridgeType(value as typeof bridgeType)}
              >
                <SelectTrigger
                  className={cn("w-full border rounded-none tracking-wide", darkMode ? 'bg-[#0e0e0e]/60 border-gray-700 text-white hover:bg-[#0e0e0e]' : 'bg-white border-black text-gray-900 hover:bg-gray-50')}
                >
                  <SelectValue placeholder="SELECT BRIDGE TYPE" />
                </SelectTrigger>
                <SelectContent
                  className={cn("rounded-none border", darkMode ? 'bg-[#0e0e0e] text-white border-gray-700' : 'bg-white text-gray-900 border-black')}
                >
                  {bridgeTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="tracking-wide">
                      {option.label.toUpperCase()}
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
                    <TabsTrigger key={option.value} value={option.value} className="tracking-wide">
                      {option.label.toUpperCase()}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
        </section>
  
        {bridgeType === 'erc20-erc20' ? (
          <form onSubmit={handleSubmit} className="contents grid grid-cols-1 md:grid-cols-2 gap-2">
            {/* Home Chain Configuration Block */}
            <section className={cn("col-span-1 border p-6", darkMode ? 'border-gray-700' : 'border-black')}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-wide">
                  HOME CHAIN CONFIGURATION
                </h2>
                <div className="w-full md:w-auto">
                  <Select
                    value={selectedHomeChainId}
                    onValueChange={handleHomeChainSelect}
                    disabled={chainsLoading}
                  >
                    <SelectTrigger
                      className={cn("cursor-target w-full md:w-[280px] border rounded-none tracking-wide", darkMode ? 'bg-[#0e0e0e]/60 border-gray-700 text-white' : 'bg-white border-black text-gray-900')}
                    >
                      <SelectValue placeholder={chainsLoading ? 'LOADING CHAINS...' : 'SELECT A CHAIN'} />
                    </SelectTrigger>
                    <SelectContent className={cn("cursor-target rounded-none border", darkMode ? 'bg-[#0e0e0e] text-white border-gray-700' : 'bg-white text-gray-900 border-black')}>
                      <SelectItem value="__custom">
                        <span className="tracking-wide">CUSTOM CONFIGURATION</span>
                      </SelectItem>
                      {availableChains.map(chain => (
                        <SelectItem
                          key={chain.id}
                          value={chain.id}
                          disabled={selectedRemoteChainId !== '__custom' && chain.id === selectedRemoteChainId}
                        >
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
                                TESTNET
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    RPC URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={homeChain.rpcUrl}
                    onChange={(e) => handleHomeChainInputChange('rpcUrl', e.target.value)}
                    disabled={!!homeChainDisabledFields.rpcUrl}
                    readOnly={!!homeChainDisabledFields.rpcUrl}
                    className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', homeChainDisabledFields.rpcUrl ? 'opacity-70 cursor-not-allowed' : '')}
                    placeholder="https://api.avax-test.network/ext/bc/C/rpc"
                  />
                </div>
  
                <div className="md:col-span-2">
                  <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    BLOCKCHAIN ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={homeChain.blockchainId}
                    onChange={(e) => handleHomeChainInputChange('blockchainId', e.target.value)}
                    disabled={!!homeChainDisabledFields.blockchainId}
                    readOnly={!!homeChainDisabledFields.blockchainId}
                    className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', homeChainDisabledFields.blockchainId ? 'opacity-70 cursor-not-allowed' : '')}
                    placeholder="0x7fc93d85c6d62c5b2ac0b519c87010ea5294012d1e407030d6acd0021cac10d5"
                  />
                </div>
              </div>

              {/* Teleporter Registry Configuration */}
              <div className={cn("mt-6 pt-6 border-t", darkMode ? 'border-gray-700' : 'border-black')}>
                <div className="flex items-center gap-3 mb-4">
                  <Switch
                    id="home_icm_setup"
                    checked={homeChainHasICMSetup}
                    onCheckedChange={handleHomeChainICMSetupChange}
                    disabled={homeChainICMDisabled}
                    className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-700/80 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="home_icm_setup" className={cn("text-xs font-medium cursor-pointer tracking-widest", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    DOES YOUR CHAIN HAVE AN ICM SETUP?
                  </label>
                </div>
                <h3 className="text-lg font-bold tracking-wide mb-4">
                  TELEPORTER REGISTRY
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
                    <label htmlFor="home_teleporter_registry_deploy" className="text-xs font-medium tracking-widest">
                      DEPLOY TELEPORTER REGISTRY
                    </label>
                  </div>
                )}
                {homeChainHasICMSetup && (
                  <div>
                    <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      CONTRACT ADDRESS *
                    </label>
                    <input
                      type="text"
                      required
                      value={homeChain.teleporterRegistryAddress}
                      onChange={(e) => handleHomeChainInputChange('teleporterRegistryAddress', e.target.value)}
                      disabled={!!homeChainDisabledFields.teleporterRegistryAddress}
                      readOnly={!!homeChainDisabledFields.teleporterRegistryAddress}
                      className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', homeChainDisabledFields.teleporterRegistryAddress ? 'opacity-70 cursor-not-allowed' : '')}
                      placeholder="0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228"
                    />
                  </div>
                )}
              </div>
  
              {/* Token Configuration */}
              <div className={cn("mt-6 pt-6 border-t", darkMode ? 'border-gray-700' : 'border-black')}>
                <h3 className="text-lg font-bold tracking-wide mb-4">
                  TOKEN CONFIGURATION
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      TOKEN ADDRESS *
                    </label>
                    <input
                      type="text"
                      required
                      value={homeChain.tokenAddress}
                      onChange={(e) => handleHomeChainInputChange('tokenAddress', e.target.value)}
                      className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black')}
                      placeholder="0x9dafF7B0c496591CC20Af1D8394FF1cB8696c9a7"
                    />
                  </div>
  
                  <div>
                    <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      TOKEN DECIMALS *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="18"
                      value={homeChain.tokenDecimals}
                      onChange={(e) => handleHomeChainInputChange('tokenDecimals', e.target.value)}
                      className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black')}
                      placeholder="18"
                    />
                  </div>
                </div>
              </div>
  
              
            </section>
  
            {/* Remote Chain Configuration Block */}
            <section className={cn("border p-6", darkMode ? 'border-gray-700' : 'border-black')}>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
                <h2 className="text-2xl font-bold tracking-wide">
                  REMOTE CHAIN CONFIGURATION
                </h2>
                <div className="w-full md:w-auto">
                  <Select
                    value={selectedRemoteChainId}
                    onValueChange={handleRemoteChainSelect}
                    disabled={chainsLoading}
                  >
                    <SelectTrigger
                      className={cn("cursor-target w-full md:w-[280px] border rounded-none tracking-wide", darkMode ? 'bg-[#0e0e0e]/60 border-gray-700 text-white' : 'bg-white border-black text-gray-900')}
                    >
                      <SelectValue placeholder={chainsLoading ? 'LOADING CHAINS...' : 'SELECT A CHAIN'} />
                    </SelectTrigger>
                    <SelectContent className={cn("cursor-target rounded-none border", darkMode ? 'bg-[#0e0e0e] text-white border-gray-700' : 'bg-white text-gray-900 border-black')}>
                      <SelectItem value="__custom">
                        <span className="tracking-wide">CUSTOM CONFIGURATION</span>
                      </SelectItem>
                      {availableChains.map(chain => (
                        <SelectItem
                          key={chain.id}
                          value={chain.id}
                          disabled={selectedHomeChainId !== '__custom' && chain.id === selectedHomeChainId}
                        >
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
                                TESTNET
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
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    RPC URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={remoteChain.rpcUrl}
                    onChange={(e) => handleRemoteChainInputChange('rpcUrl', e.target.value)}
                    disabled={!!remoteChainDisabledFields.rpcUrl}
                    readOnly={!!remoteChainDisabledFields.rpcUrl}
                    className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', remoteChainDisabledFields.rpcUrl ? 'opacity-70 cursor-not-allowed' : '')}
                    placeholder="https://subnets.avax.network/dispatch/testnet/rpc"
                  />
                </div>
  
                <div className="md:col-span-2">
                  <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    BLOCKCHAIN ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={remoteChain.blockchainId}
                    onChange={(e) => handleRemoteChainInputChange('blockchainId', e.target.value)}
                    disabled={!!remoteChainDisabledFields.blockchainId}
                    readOnly={!!remoteChainDisabledFields.blockchainId}
                    className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', remoteChainDisabledFields.blockchainId ? 'opacity-70 cursor-not-allowed' : '')}
                    placeholder="0x9f49313c3f022e9fe5b6e7c1d98f0f53d86e53456c5e075e1881cac1c15968e4"
                  />
                </div>
              </div>

              {/* Teleporter Registry Configuration */}
              <div className={cn("mt-6 pt-6 border-t", darkMode ? 'border-gray-700' : 'border-black')}>
                <div className="flex items-center gap-3 mb-4">
                  <Switch
                    id="remote_icm_setup"
                    checked={remoteChainHasICMSetup}
                    onCheckedChange={handleRemoteChainICMSetupChange}
                    disabled={remoteChainICMDisabled}
                    className="data-[state=checked]:bg-red-500 data-[state=unchecked]:bg-gray-700/80 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <label htmlFor="remote_icm_setup" className={cn("text-xs font-medium cursor-pointer tracking-widest", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    DOES YOUR CHAIN HAVE AN ICM SETUP?
                  </label>
                </div>
                <h3 className="text-lg font-bold tracking-wide mb-4">
                  TELEPORTER REGISTRY
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
                    <label htmlFor="remote_teleporter_registry_deploy" className="text-xs font-medium tracking-widest">
                      DEPLOY TELEPORTER REGISTRY
                    </label>
                  </div>
                )}
                {remoteChainHasICMSetup && (
                  <div>
                    <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      CONTRACT ADDRESS *
                    </label>
                    <input
                      type="text"
                      required
                      value={remoteChain.teleporterRegistryAddress}
                      onChange={(e) => handleRemoteChainInputChange('teleporterRegistryAddress', e.target.value)}
                      disabled={!!remoteChainDisabledFields.teleporterRegistryAddress}
                      readOnly={!!remoteChainDisabledFields.teleporterRegistryAddress}
                      className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', remoteChainDisabledFields.teleporterRegistryAddress ? 'opacity-70 cursor-not-allowed' : '')}
                      placeholder="0xF86Cb19Ad8405AEFa7d09C778215D2Cb6eBfB228"
                    />
                  </div>
                )}
              </div>
  
              {/* Token Configuration */}
              <div className={cn("mt-6 pt-6 border-t", darkMode ? 'border-gray-700' : 'border-black')}>
                <h3 className="text-lg font-bold tracking-wide mb-4">
                  TOKEN CONFIGURATION
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className={cn("flex items-center gap-2 text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      TOKEN NAME *
                      <div className="relative group">
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                          <div className={cn("relative text-xs rounded-none px-3 py-2 shadow-lg border whitespace-nowrap", darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-[#0e0e0e] text-white border-gray-600')}>
                            WHAT SHOULD BE YOUR WRAPPED TOKEN NAME ON YOUR CHAIN. EXAMPLE: WRAPPED AVAX
                            <div className={cn("absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-transparent border-r-transparent border-b-transparent border-4", darkMode ? 'border-t-gray-800' : 'border-t-gray-900')}></div>
                          </div>
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      required
                      value={remoteChain.tokenName}
                      onChange={(e) => handleRemoteChainInputChange('tokenName', e.target.value)}
                      disabled={!!remoteChainDisabledFields.tokenName}
                      readOnly={!!remoteChainDisabledFields.tokenName}
                      className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', remoteChainDisabledFields.tokenName ? 'opacity-70 cursor-not-allowed' : '')}
                      placeholder="Wrapped Avax"
                    />
                  </div>
  
                  <div>
                    <label className={cn("flex items-center gap-2 text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      TOKEN SYMBOL * 
                      <div className="relative group">
                        <Info className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help" />
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                          <div className={cn("relative text-xs rounded-none px-3 py-2 shadow-lg border whitespace-nowrap", darkMode ? 'bg-gray-800 text-gray-200 border-gray-700' : 'bg-[#0e0e0e] text-white border-gray-600')}>
                            WHAT SHOULD BE YOUR WRAPPED TOKEN SYMBOL ON YOUR CHAIN. EXAMPLE: WAVAX
                            <div className={cn("absolute top-full left-1/2 -translate-x-1/2 -mt-px w-0 h-0 border-l-transparent border-r-transparent border-b-transparent border-4", darkMode ? 'border-t-gray-800' : 'border-t-gray-900')}></div>
                          </div>
                        </div>
                      </div>
                    </label>
                    <input
                      type="text"
                      required
                      value={remoteChain.tokenSymbol}
                      onChange={(e) => handleRemoteChainInputChange('tokenSymbol', e.target.value)}
                      disabled={!!remoteChainDisabledFields.tokenSymbol}
                      readOnly={!!remoteChainDisabledFields.tokenSymbol}
                      className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black', remoteChainDisabledFields.tokenSymbol ? 'opacity-70 cursor-not-allowed' : '')}
                      placeholder="WAVAX"
                    />
                  </div>
  
                  <div>
                    <label className={cn("block text-xs font-medium tracking-widest mb-2", darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      TOKEN DECIMALS *
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      max="18"
                      value={remoteChain.tokenDecimals}
                      onChange={(e) => handleRemoteChainInputChange('tokenDecimals', e.target.value)}
                      className={cn("cursor-target w-full px-4 py-3 border rounded-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all", darkMode ? 'bg-gray-800/50 text-white border-gray-700' : 'bg-white text-gray-900 border-black')}
                      placeholder="18"
                    />
                  </div>
                </div>
              </div>
  
            </section>
  
            {/* Submit Button Block */}
            <section className={cn("col-span-2 border p-6", darkMode ? 'border-gray-700' : 'border-black')}>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={cn("cursor-target flex items-center gap-3 px-8 py-4 border rounded-none font-semibold tracking-widest transition-all", isSubmitting ? 'cursor-not-allowed opacity-60' : 'cursor-pointer', darkMode ? 'bg-red-500/20 hover:bg-red-500/30 text-red-400 border-red-700/30' : 'bg-red-200 hover:bg-red-300 text-red-600 border-red-300')}
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      DEPLOYING...
                    </>
                  ) : (
                    'DEPLOY BRIDGE'
                  )}
                </button>
              </div>
            </section>
          </form>
        ) : (
          <section className={cn("border p-12 flex flex-col items-center justify-center gap-4", darkMode ? 'border-gray-700 bg-[#0e0e0e]/30' : 'border-black bg-gray-50')}>
            <div id="computer" className="w-full max-w-[340px] mx-auto">
              <span className="computer-graphic" />
            </div>
            <p className="text-4xl font-bold tracking-wide">COMING SOON...</p>
            <p className={cn("text-xs tracking-widest", darkMode ? 'text-gray-400' : 'text-gray-600')}>
              THIS BRIDGE CONFIGURATION IS UNDER DEVELOPMENT
            </p>
          </section>
        )}
  
      </div>
  

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
