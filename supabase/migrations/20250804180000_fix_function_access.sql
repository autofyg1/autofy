-- Create increment function for updating zap stats
CREATE OR REPLACE FUNCTION increment(current_value integer, increment_by integer DEFAULT 1)
RETURNS integer AS $$
BEGIN
  RETURN current_value + increment_by;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update zap run statistics
CREATE OR REPLACE FUNCTION update_zap_run_stats(zap_id_param uuid, emails_processed integer DEFAULT 0)
RETURNS void AS $$
BEGIN
  UPDATE zaps 
  SET 
    last_run_at = now(),
    total_runs = total_runs + 1
  WHERE id = zap_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION update_zap_run_stats(uuid, integer) TO service_role;
GRANT EXECUTE ON FUNCTION increment(integer, integer) TO service_role;

-- Add policy to allow service role to bypass RLS for automation
ALTER TABLE zaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE zap_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;

-- Create policies for service role (for edge functions)
CREATE POLICY "Service role can manage all zaps"
  ON zaps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all zap steps"
  ON zap_steps
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role can manage all integrations"
  ON integrations
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
