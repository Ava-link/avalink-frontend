-- Fix RLS policies to allow public access for testing
-- Drop existing policies first
DROP POLICY IF EXISTS "Allow authenticated users to insert chains" ON chains;
DROP POLICY IF EXISTS "Allow authenticated users to insert tokens" ON tokens;
DROP POLICY IF EXISTS "Allow authenticated users to insert bridges" ON bridges;
DROP POLICY IF EXISTS "Allow authenticated users to update chains" ON chains;
DROP POLICY IF EXISTS "Allow authenticated users to update tokens" ON tokens;
DROP POLICY IF EXISTS "Allow authenticated users to update bridges" ON bridges;

-- Create new policies that allow public access
CREATE POLICY "Allow public insert access to chains" ON chains
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert access to tokens" ON tokens
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public insert access to bridges" ON bridges
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update access to chains" ON chains
    FOR UPDATE USING (true);

CREATE POLICY "Allow public update access to tokens" ON tokens
    FOR UPDATE USING (true);

CREATE POLICY "Allow public update access to bridges" ON bridges
    FOR UPDATE USING (true);
