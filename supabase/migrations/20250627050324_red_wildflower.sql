/*
  # Create user feedback table

  1. New Tables
    - `user_feedback`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `user_name` (text)
      - `user_email` (text, optional)
      - `type` (text with check constraint)
      - `title` (text)
      - `description` (text)
      - `rating` (integer, optional)
      - `status` (text with check constraint)
      - `admin_notes` (text, optional)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `user_feedback` table
    - Add policies for users to manage own feedback
    - Add policy for service role to manage all feedback

  3. Constraints
    - Check constraint for rating between 1-5
    - Check constraint for valid feedback types and statuses
*/

CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  user_name text NOT NULL,
  user_email text,
  type text CHECK (type IN ('suggestion', 'bug', 'praise', 'other')) NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  rating integer CHECK (rating >= 1 AND rating <= 5),
  status text CHECK (status IN ('pending', 'reviewed', 'implemented', 'declined')) DEFAULT 'pending',
  admin_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;

-- Users can create and view their own feedback
CREATE POLICY "Users can manage own feedback"
  ON user_feedback
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role can manage all feedback
CREATE POLICY "Service role can manage all feedback"
  ON user_feedback
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Trigger to update updated_at
CREATE TRIGGER update_user_feedback_updated_at
  BEFORE UPDATE ON user_feedback
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_feedback_user_id ON user_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedback_status ON user_feedback(status);
CREATE INDEX IF NOT EXISTS idx_user_feedback_type ON user_feedback(type);
CREATE INDEX IF NOT EXISTS idx_user_feedback_created_at ON user_feedback(created_at);