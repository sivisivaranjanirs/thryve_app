/*
  # Create notification tables

  1. New Tables
    - `friend_notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `friend_id` (uuid, foreign key to auth.users)
      - `notification_type` (text with check constraint)
      - `title` (text)
      - `message` (text)
      - `data` (jsonb, optional)
      - `is_read` (boolean)
      - `created_at` (timestamptz)

    - `push_subscriptions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `endpoint` (text)
      - `p256dh_key` (text)
      - `auth_key` (text)
      - `is_active` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `notification_queue`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `notification_type` (text)
      - `title` (text)
      - `body` (text)
      - `data` (jsonb, optional)
      - `status` (text with check constraint)
      - `attempts` (integer)
      - `created_at` (timestamptz)
      - `processed_at` (timestamptz, optional)

  2. Security
    - Enable RLS on all tables
    - Add policies for users to manage own notifications and subscriptions

  3. Indexes
    - Add indexes for efficient notification queries
*/

CREATE TABLE IF NOT EXISTS friend_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text CHECK (notification_type IN ('health_metric', 'friend_request', 'friend_accepted', 'reading_request', 'reading_accepted')) NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  data jsonb,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  endpoint text NOT NULL,
  p256dh_key text NOT NULL,
  auth_key text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT unique_user_endpoint UNIQUE (user_id, endpoint)
);

CREATE TABLE IF NOT EXISTS notification_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  data jsonb,
  status text CHECK (status IN ('pending', 'sent', 'failed')) DEFAULT 'pending',
  attempts integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz
);

-- Enable RLS
ALTER TABLE friend_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_queue ENABLE ROW LEVEL SECURITY;

-- Friend notifications policies
CREATE POLICY "Users can manage own notifications"
  ON friend_notifications
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Push subscriptions policies
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Notification queue policies (service role only for processing)
CREATE POLICY "Service role can manage notification queue"
  ON notification_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Users can view their own queued notifications
CREATE POLICY "Users can view own queued notifications"
  ON notification_queue
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_push_subscriptions_updated_at
  BEFORE UPDATE ON push_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_friend_notifications_user_id ON friend_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_friend_notifications_is_read ON friend_notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status);
CREATE INDEX IF NOT EXISTS idx_notification_queue_created_at ON notification_queue(created_at);