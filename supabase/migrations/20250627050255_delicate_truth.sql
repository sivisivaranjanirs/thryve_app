/*
  # Create reading requests table

  1. New Tables
    - `reading_requests`
      - `id` (uuid, primary key)
      - `requester_id` (uuid, foreign key to auth.users)
      - `owner_id` (uuid, foreign key to auth.users)
      - `status` (text with check constraint)
      - `message` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `reading_requests` table
    - Add policies for users to manage requests they send or receive

  3. Constraints
    - Unique constraint on requester_id and owner_id combination for pending requests
    - Check constraint to prevent self-requests
*/

CREATE TABLE IF NOT EXISTS reading_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted', 'declined')) DEFAULT 'pending',
  message text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_request CHECK (requester_id != owner_id)
);

ALTER TABLE reading_requests ENABLE ROW LEVEL SECURITY;

-- Users can manage requests they send
CREATE POLICY "Users can manage requests they send"
  ON reading_requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = requester_id)
  WITH CHECK (auth.uid() = requester_id);

-- Users can manage requests they receive
CREATE POLICY "Users can manage requests they receive"
  ON reading_requests
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Trigger to update updated_at
CREATE TRIGGER update_reading_requests_updated_at
  BEFORE UPDATE ON reading_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create unique index for pending requests to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_request 
  ON reading_requests(requester_id, owner_id) 
  WHERE status = 'pending';