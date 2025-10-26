# Supabase Setup Guide for Avalink

This guide will help you set up Supabase for the Avalink chain registration system.

## 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project"
3. Choose your organization and enter project details:
   - Name: `avalink-database`
   - Database Password: (choose a strong password)
   - Region: (choose closest to your users)
4. Click "Create new project"

## 2. Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (looks like: `https://your-project-id.supabase.co`)
   - **anon public** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)
   - **service_role** key (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## 3. Set Up Environment Variables

1. Copy `.env.example` to `.env.local`:
   ```bash
   cp .env.example .env.local
   ```

2. Update `.env.local` with your Supabase credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

## 4. Set Up Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Copy the contents of `supabase-schema.sql` and paste it into the SQL editor
3. Click **Run** to execute the schema creation

This will create:
- `chains` table for blockchain information
- `tokens` table for token configurations
- `bridges` table for bridge connections
- Proper indexes and Row Level Security (RLS) policies

## 5. Verify Setup

1. Go to **Table Editor** in your Supabase dashboard
2. You should see three tables: `chains`, `tokens`, and `bridges`
3. The tables should have the correct columns and relationships

## 6. Test the Application

1. Start your Next.js development server:
   ```bash
   npm run dev
   ```

2. Navigate to the chain registration page by clicking "Add Chain" in the header
3. Fill out the form and submit to test the database integration

## Database Schema Overview

### Chains Table
- `chain_id`: Unique blockchain identifier (e.g., 43114 for Avalanche C-Chain)
- `chain_name`: Human-readable name (e.g., "Avalanche C-Chain")
- `blockchain_id_hex`: Hexadecimal blockchain ID
- `native_token`: Native token symbol (e.g., "AVAX")
- `rpc_url`: RPC endpoint URL
- `has_teleporters`: Boolean for teleporter support
- `teleporter_address`: Teleporter contract address
- `teleporter_registry_address`: Teleporter registry address

### Tokens Table
- `chain_id`: References chains table
- `address`: Token contract address
- `type`: Token type (NATIVE, ERC20, BRIDGED)
- `name`: Token name (e.g., "USD Coin")
- `symbol`: Token symbol (e.g., "USDC")
- `decimals`: Token decimals

### Bridges Table
- `source_chain_id`: Source blockchain ID
- `target_chain_id`: Target blockchain ID
- `teleporter_address`: Bridge contract address
- `bridge_contract_address`: Bridge contract address
- `status`: Bridge status (deployed, pending, failed)
- `tx_hash`: Deployment transaction hash

## Security Notes

- The schema includes Row Level Security (RLS) policies
- Public read access is enabled for all tables
- Only authenticated users can insert/update data
- You can modify these policies based on your security requirements

## Troubleshooting

### Common Issues

1. **"Invalid API key" error**: Check that your environment variables are correctly set
2. **"Table doesn't exist" error**: Make sure you've run the SQL schema in Supabase
3. **Permission denied**: Check your RLS policies in Supabase dashboard

### Getting Help

- Check the [Supabase Documentation](https://supabase.com/docs)
- Review the [Next.js Supabase Integration Guide](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs)
