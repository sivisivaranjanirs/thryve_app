/*
  # Create database functions for business logic

  1. Functions
    - `accept_reading_request` - Accept a reading request and create permission
    - `decline_reading_request` - Decline a reading request
    - `create_friend_notification` - Create notifications for friend activities
    - `get_user_health_summary` - Get health metrics summary for a user
    - `cleanup_old_notifications` - Clean up old read notifications

  2. Security
    - Functions use SECURITY DEFINER to run with elevated privileges
    - Proper permission checks within functions
*/

-- Function to accept reading request and create permission
CREATE OR REPLACE FUNCTION accept_reading_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  req_record reading_requests;
BEGIN
  -- Get the request details
  SELECT * INTO req_record
  FROM reading_requests
  WHERE id = request_id AND owner_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reading request not found or not authorized';
  END IF;
  
  -- Update request status
  UPDATE reading_requests
  SET status = 'accepted', updated_at = now()
  WHERE id = request_id;
  
  -- Create reading permission
  INSERT INTO reading_permissions (viewer_id, owner_id)
  VALUES (req_record.requester_id, req_record.owner_id)
  ON CONFLICT (viewer_id, owner_id) DO UPDATE SET
    status = 'active',
    updated_at = now();
  
  -- Create notification for requester
  INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message, data)
  VALUES (
    req_record.requester_id,
    req_record.owner_id,
    'reading_accepted',
    'Reading Request Accepted',
    'Your request to view health data has been accepted',
    jsonb_build_object('request_id', request_id)
  );
END;
$$;

-- Function to decline reading request
CREATE OR REPLACE FUNCTION decline_reading_request(request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update request status
  UPDATE reading_requests
  SET status = 'declined', updated_at = now()
  WHERE id = request_id AND owner_id = auth.uid() AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reading request not found or not authorized';
  END IF;
END;
$$;

-- Function to create friend notifications
CREATE OR REPLACE FUNCTION create_friend_notification(
  target_user_id uuid,
  from_user_id uuid,
  notif_type text,
  notif_title text,
  notif_message text,
  notif_data jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id uuid;
BEGIN
  INSERT INTO friend_notifications (user_id, friend_id, notification_type, title, message, data)
  VALUES (target_user_id, from_user_id, notif_type, notif_title, notif_message, notif_data)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$;

-- Function to get user health summary
CREATE OR REPLACE FUNCTION get_user_health_summary(target_user_id uuid, days_back integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  cutoff_date timestamptz;
BEGIN
  -- Check if user has permission to view this data
  IF target_user_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM reading_permissions
    WHERE viewer_id = auth.uid() AND owner_id = target_user_id AND status = 'active'
  ) THEN
    RAISE EXCEPTION 'Not authorized to view this user''s health data';
  END IF;
  
  cutoff_date := now() - (days_back || ' days')::interval;
  
  SELECT jsonb_object_agg(metric_type, metric_data) INTO result
  FROM (
    SELECT 
      metric_type,
      jsonb_build_object(
        'count', COUNT(*),
        'latest_value', (
          SELECT value 
          FROM health_metrics hm2 
          WHERE hm2.user_id = target_user_id 
            AND hm2.metric_type = hm.metric_type 
          ORDER BY recorded_at DESC 
          LIMIT 1
        ),
        'latest_date', (
          SELECT recorded_at 
          FROM health_metrics hm2 
          WHERE hm2.user_id = target_user_id 
            AND hm2.metric_type = hm.metric_type 
          ORDER BY recorded_at DESC 
          LIMIT 1
        )
      ) as metric_data
    FROM health_metrics hm
    WHERE user_id = target_user_id 
      AND recorded_at >= cutoff_date
    GROUP BY metric_type
  ) summary;
  
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$;

-- Function to cleanup old notifications
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count integer;
BEGIN
  -- Delete read notifications older than 30 days
  DELETE FROM friend_notifications
  WHERE is_read = true 
    AND created_at < now() - interval '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RETURN deleted_count;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION accept_reading_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION decline_reading_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION create_friend_notification(uuid, uuid, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_health_summary(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_old_notifications() TO service_role;