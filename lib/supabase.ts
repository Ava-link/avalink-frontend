import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types based on your schema
export interface Chain {
  id?: number
  chain_id: number
  chain_name: string
  blockchain_id_hex?: string | null
  native_token?: string | null
  rpc_url: string
  has_teleporters: boolean
  teleporter_address?: string | null
  teleporter_registry_address?: string | null
  created_at?: string
  updated_at?: string
}

export interface Token {
  id?: number
  chain_id: number
  address: string
  type: 'ERC20' | 'NATIVE' | 'BRIDGED'
  name: string
  symbol: string
  decimals: number
  created_at?: string
  updated_at?: string
}

export interface Bridge {
  id?: number
  source_chain_id: number
  target_chain_id: number
  teleporter_address?: string
  bridge_contract_address?: string
  status: 'deployed' | 'pending' | 'failed'
  tx_hash?: string
  deployed_at?: string
  updated_at?: string
}
