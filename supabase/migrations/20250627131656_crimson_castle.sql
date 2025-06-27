/*
  # Create health_metrics table

  1. New Tables
    - `health_metrics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `metric_type` (text with check constraint)
      - `value` (text)
      - `unit` (text)
      - `notes` (text, optional)
      - `recorded_at` (timestamptz)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `health_metrics` table
    - Add policy for users to manage own health metrics
    - Add policy for users to view metrics they have reading permissions for

  3. Performance
    - Add indexes for commonly queried columns
*/

CREATE TABLE IF NOT EXISTS health_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  metric_type text NOT NULL CHECK (metric_type = ANY (ARRAY['blood_pressure'::text, 'blood_glucose'::text, 'heart_rate'::text, 'temperature'::text, 'weight'::text])),
  value text NOT NULL,
  unit text NOT NULL,
  notes text,
  recorded_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_id ON health_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_health_metrics_recorded_at ON health_metrics(recorded_at);
CREATE INDEX IF NOT EXISTS idx_health_metrics_metric_type ON health_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_health_metrics_user_recorded ON health_metrics(user_id, recorded_at DESC);

-- RLS Policies
CREATE POLICY "Users can manage own health metrics"
  ON health_metrics
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view health metrics they have permission to read"
  ON health_metrics
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM reading_permissions
      WHERE reading_permissions.viewer_id = auth.uid()
        AND reading_permissions.owner_id = health_metrics.user_id
        AND reading_permissions.status = 'active'
    )
  );