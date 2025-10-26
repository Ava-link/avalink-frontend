-- ==========================================
-- AVALINK DATABASE SCHEMA FOR SUPABASE
-- ==========================================

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. CHAINS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS chains (
    id SERIAL PRIMARY KEY,
    chain_id BIGINT UNIQUE NOT NULL,
    chain_name VARCHAR(100) NOT NULL,
    blockchain_id_hex VARCHAR(100) UNIQUE,
    native_token VARCHAR(50),
    rpc_url TEXT NOT NULL,
    has_teleporters BOOLEAN DEFAULT FALSE,
    teleporter_address TEXT,
    teleporter_registry_address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 2. TOKENS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS tokens (
    id SERIAL PRIMARY KEY,
    chain_id BIGINT NOT NULL REFERENCES chains(chain_id) ON DELETE CASCADE,
    address TEXT NOT NULL,
    type VARCHAR(50) CHECK (type IN ('ERC20', 'NATIVE', 'BRIDGED')),
    name VARCHAR(100) NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    decimals SMALLINT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (chain_id, address)
);

-- ==========================================
-- 3. BRIDGES / ICTT SETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS bridges (
    id SERIAL PRIMARY KEY,
    source_chain_id BIGINT NOT NULL REFERENCES chains(chain_id) ON DELETE CASCADE,
    target_chain_id BIGINT NOT NULL REFERENCES chains(chain_id) ON DELETE CASCADE,
    teleporter_address TEXT,
    bridge_contract_address TEXT,
    status VARCHAR(20) DEFAULT 'deployed' CHECK (status IN ('deployed', 'pending', 'failed')),
    tx_hash TEXT,
    deployed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (source_chain_id, target_chain_id)
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_chains_chain_id ON chains(chain_id);
CREATE INDEX IF NOT EXISTS idx_tokens_chain_id ON tokens(chain_id);
CREATE INDEX IF NOT EXISTS idx_tokens_address ON tokens(address);
CREATE INDEX IF NOT EXISTS idx_bridges_source_chain ON bridges(source_chain_id);
CREATE INDEX IF NOT EXISTS idx_bridges_target_chain ON bridges(target_chain_id);

-- ==========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE chains ENABLE ROW LEVEL SECURITY;
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE bridges ENABLE ROW LEVEL SECURITY;

-- Allow public read access to chains
CREATE POLICY "Allow public read access to chains" ON chains
    FOR SELECT USING (true);

-- Allow public read access to tokens
CREATE POLICY "Allow public read access to tokens" ON tokens
    FOR SELECT USING (true);

-- Allow public read access to bridges
CREATE POLICY "Allow public read access to bridges" ON bridges
    FOR SELECT USING (true);

-- Allow authenticated users to insert chains (you can modify this based on your auth requirements)
CREATE POLICY "Allow authenticated users to insert chains" ON chains
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert tokens
CREATE POLICY "Allow authenticated users to insert tokens" ON tokens
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to insert bridges
CREATE POLICY "Allow authenticated users to insert bridges" ON bridges
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow authenticated users to update chains
CREATE POLICY "Allow authenticated users to update chains" ON chains
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to update tokens
CREATE POLICY "Allow authenticated users to update tokens" ON tokens
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Allow authenticated users to update bridges
CREATE POLICY "Allow authenticated users to update bridges" ON bridges
    FOR UPDATE USING (auth.role() = 'authenticated');

-- ==========================================
-- FUNCTIONS FOR UPDATED_AT TRIGGERS
-- ==========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ==========================================
-- TRIGGERS FOR UPDATED_AT
-- ==========================================
CREATE TRIGGER update_chains_updated_at BEFORE UPDATE ON chains
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tokens_updated_at BEFORE UPDATE ON tokens
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bridges_updated_at BEFORE UPDATE ON bridges
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- SAMPLE DATA (OPTIONAL)
-- ==========================================
-- Uncomment the following lines to insert sample data

/*
-- Insert sample chains
INSERT INTO chains (chain_id, chain_name, blockchain_id_hex, native_token, rpc_url, has_teleporters) VALUES
(43114, 'Avalanche C-Chain', '0x0000000000000000000000000000000000000000000000000000000000000000', 'AVAX', 'https://api.avax.network/ext/bc/C/rpc', true),
(43113, 'Avalanche Fuji Testnet', '0x0000000000000000000000000000000000000000000000000000000000000000', 'AVAX', 'https://api.avax-test.network/ext/bc/C/rpc', true);

-- Insert sample tokens
INSERT INTO tokens (chain_id, address, type, name, symbol, decimals) VALUES
(43114, '0x0000000000000000000000000000000000000000', 'NATIVE', 'Avalanche', 'AVAX', 18),
(43114, '0xA0b86a33E6441b8c4C8C0E4A8c4c4c4c4c4c4c4c', 'ERC20', 'USD Coin', 'USDC', 6),
(43113, '0x0000000000000000000000000000000000000000', 'NATIVE', 'Avalanche', 'AVAX', 18);
*/
