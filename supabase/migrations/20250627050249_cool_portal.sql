/*
  # Create reading permissions table

  1. New Tables
    - `reading_permissions`
      - `id` (uuid, primary key)
      - `viewer_id` (uuid, foreign key to auth.users)
      - `owner_id` (uuid, foreign key to auth.users)
      - `status` (text with check constraint)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `reading_permissions` table
    - Add policies for users to manage permissions they own or are part of

  3. Constraints
    - Unique constraint on viewer_id and owner_id combination
    - Check constraint to prevent self-permissions
*/

CREATE TABLE IF NOT EXISTS reading_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  owner_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('active', 'blocked')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT no_self_permission CHECK (viewer_id != owner_id),
  CONSTRAINT unique_permission UNIQUE (viewer_id, owner_id)
);

ALTER TABLE reading_permissions ENABLE ROW LEVEL SECURITY;

-- Users can manage permissions where they are the owner
CREATE POLICY "Users can manage permissions they own"
  ON reading_permissions
  FOR ALL
  TO authenticated
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Users can view permissions where they are the viewer
CREATE POLICY "Users can view permissions they have"
  ON reading_permissions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = viewer_id);

-- Trigger to update updated_at
CREATE TRIGGER update_reading_permissions_updated_at
  BEFORE UPDATE ON reading_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();