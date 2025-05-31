# Supabase SQL Functions Test Plan

This document outlines test cases and example SQL snippets for testing the various PL/pgSQL and SQL functions created for the application.
It is crucial to run these tests in a dedicated test environment or ensure proper data backup and cleanup procedures are followed if run in a development environment.

**General Testing Notes:**
-   Replace placeholder UUIDs (e.g., `'user_a_uuid'`, `'match_m_uuid'`) with actual UUIDs from your test data or generate new ones.
-   Use transaction blocks (`BEGIN; ... COMMIT;/ROLLBACK;`) for DML operations to isolate tests and easily revert changes. `ROLLBACK` is generally safer for test runs.
-   For functions intended to be run by cron jobs, manual testing involves setting up the prerequisite data and then calling the function directly to simulate its execution.
-   Check database logs for `RAISE LOG` messages for functions that use them.

---

## 1. Function: `public.get_user_role(p_user_id UUID) RETURNS TEXT`

### Function Signature:
`get_user_role(p_user_id UUID) RETURNS TEXT`

### Test Cases:

1.  **TC1: User with a defined role.**
    -   Verify the function returns the correct role string (e.g., 'admin', 'tracker').
2.  **TC2: User with no role defined in `raw_app_meta_data`.**
    -   Verify the function returns `NULL`.
3.  **TC3: User with `raw_app_meta_data` present but no 'role' key.**
    -   Verify the function returns `NULL`.
4.  **TC4: Non-existent `p_user_id`.**
    -   Verify the function returns `NULL`.

### Example SQL Snippets:

**Setup (Common for TC1-TC3): Create test users**
```sql
-- Ensure these users exist in auth.users for testing.
-- Replace with actual UUIDs or insert new ones.
-- Note: Direct INSERT into auth.users is usually for setup; Supabase API for actual user creation.
-- For testing, you might need to temporarily elevate privileges or use a service role.

-- User A: Will have 'admin' role
INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data)
VALUES ('user_a_uuid', 'admin_user@example.com', 'fakepassword', '{"role": "admin"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data;

-- User B: Will have 'tracker' role
INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data)
VALUES ('user_b_uuid', 'tracker_user@example.com', 'fakepassword', '{"role": "tracker"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data;

-- User C: Has other metadata but no role
INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data)
VALUES ('user_c_uuid', 'norole_user@example.com', 'fakepassword', '{"prefs": "darkmode"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data;

-- User D: Has no raw_app_meta_data (or it's NULL)
INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data)
VALUES ('user_d_uuid', 'nullmeta_user@example.com', 'fakepassword', NULL)
ON CONFLICT (id) DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data;
```

**TC1: User with a defined role ('admin')**
```sql
-- Execution & Assertion:
SELECT public.get_user_role('user_a_uuid');
-- Expected: 'admin'
```

**TC2: User with a defined role ('tracker')**
```sql
-- Execution & Assertion:
SELECT public.get_user_role('user_b_uuid');
-- Expected: 'tracker'
```

**TC3: User with `raw_app_meta_data` present but no 'role' key.**
```sql
-- Execution & Assertion:
SELECT public.get_user_role('user_c_uuid');
-- Expected: NULL
```

**TC4: User with NULL `raw_app_meta_data`.**
```sql
-- Execution & Assertion:
SELECT public.get_user_role('user_d_uuid');
-- Expected: NULL
```

**TC5: Non-existent `p_user_id`.**
```sql
-- Execution & Assertion:
SELECT public.get_user_role('ffffffff-ffff-ffff-ffff-ffffffffffff'); -- A non-existent UUID
-- Expected: NULL
```

**Cleanup (Optional, if users were test-specific):**
```sql
-- DELETE FROM auth.users WHERE id IN ('user_a_uuid', 'user_b_uuid', 'user_c_uuid', 'user_d_uuid');
-- Caution: Only delete if these are purely test users not used elsewhere.
```
---

## 2. Function: `public.insert_notification(p_user_id UUID, p_match_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_data JSONB)`

### Function Signature:
`insert_notification(p_user_id UUID, p_match_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_data JSONB)`

### Test Cases:
1.  **TC1: Basic notification insertion.**
    -   Verify a new notification is created with all fields correctly populated, `is_read` is FALSE, `created_at` is recent, `id` is generated.
2.  **TC2: Notification with NULL `match_id`.**
    -   Verify successful insertion when `p_match_id` is NULL (e.g., for a low battery notification).
3.  **TC3: Notification with empty/NULL `p_data`.**
    -   Verify successful insertion and `data` column is NULL.
4.  **TC4: Notification with complex `p_data`.**
    -   Verify JSONB data is stored and retrieved correctly.

### Example SQL Snippets:

**Setup (Common): Ensure test user and match exist**
```sql
-- Use user_a_uuid from get_user_role setup or create a new one.
-- Create a dummy match if one doesn't exist.
INSERT INTO public.matches (id, name, status, home_team_name, away_team_name, match_date)
VALUES ('match_m_uuid', 'Test Match M', 'scheduled', 'Team Home', 'Team Away', NOW())
ON CONFLICT (id) DO NOTHING;
```

**TC1: Basic notification insertion**
```sql
BEGIN;
CALL public.insert_notification(
  'user_a_uuid',
  'match_m_uuid',
  'test_type_1',
  'Test Title 1',
  'This is test message 1.',
  '{"key1": "value1", "key2": 123}'::jsonb
);

-- Assertion:
SELECT * FROM public.notifications
WHERE user_id = 'user_a_uuid' AND type = 'test_type_1' AND title = 'Test Title 1'
  AND data->>'key1' = 'value1';
-- Expect 1 row, check is_read = false, created_at is recent.
ROLLBACK;
```

**TC2: Notification with NULL `match_id`**
```sql
BEGIN;
CALL public.insert_notification(
  'user_a_uuid',
  NULL,
  'system_alert',
  'System Alert',
  'This is a system-wide alert.',
  '{"severity": "high"}'::jsonb
);

-- Assertion:
SELECT * FROM public.notifications
WHERE user_id = 'user_a_uuid' AND type = 'system_alert' AND match_id IS NULL;
-- Expect 1 row.
ROLLBACK;
```

**TC3: Notification with NULL `p_data`**
```sql
BEGIN;
CALL public.insert_notification(
  'user_a_uuid',
  'match_m_uuid',
  'simple_type',
  'Simple Title',
  'Simple message, no data.',
  NULL
);

-- Assertion:
SELECT * FROM public.notifications
WHERE user_id = 'user_a_uuid' AND type = 'simple_type' AND data IS NULL;
-- Expect 1 row.
ROLLBACK;
```
---

## 3. Function: `public.monitor_tracker_battery_levels() RETURNS VOID`

### Function Signature:
`monitor_tracker_battery_levels() RETURNS VOID`

### Test Cases:
1.  **TC1: Tracker battery below threshold, no existing unread notification.**
    -   Verify a 'low_battery' notification is created for the user.
2.  **TC2: Tracker battery at/above threshold.**
    -   Verify no notification is created.
3.  **TC3: Tracker battery below threshold, but an unread 'low_battery' notification already exists.**
    -   Verify no new notification is created (de-duplication).
4.  **TC4: Tracker battery below threshold, an old *read* 'low_battery' notification exists.**
    -   Verify a new 'low_battery' notification is created.
5.  **TC5: Multiple trackers, some below, some above threshold.**
    -   Verify notifications are created only for those below threshold.
6.  **TC6: `tracker_device_status` table is empty.**
    -   Verify function runs without error and creates no notifications.
7.  **TC7: Tracker `battery_level` is NULL.**
    -   Verify no notification is created for this tracker.

### Example SQL Snippets:

**Setup (Common): Users and initial device status**
```sql
-- User_b_uuid ('tracker_user@example.com') from get_user_role setup will be used.
-- User_c_uuid ('norole_user@example.com') can also be used.

-- Clean previous test data for these users in relevant tables
DELETE FROM public.notifications WHERE user_id IN ('user_b_uuid', 'user_c_uuid');
DELETE FROM public.tracker_device_status WHERE user_id IN ('user_b_uuid', 'user_c_uuid');

-- User B: Battery level 15% (below threshold of 20%)
INSERT INTO public.tracker_device_status (user_id, battery_level, last_updated_at)
VALUES ('user_b_uuid', 15, NOW());

-- User C: Battery level 50% (above threshold)
INSERT INTO public.tracker_device_status (user_id, battery_level, last_updated_at)
VALUES ('user_c_uuid', 50, NOW());
```

**TC1: Tracker battery below threshold (User B)**
```sql
BEGIN;
-- Execution:
SELECT public.monitor_tracker_battery_levels();

-- Assertion:
SELECT * FROM public.notifications
WHERE user_id = 'user_b_uuid' AND type = 'low_battery'
  AND message LIKE '%battery is at 15%%'
  AND (data->>'battery_level')::int = 15;
-- Expect 1 row.
ROLLBACK;
```

**TC2: Tracker battery above threshold (User C)**
```sql
BEGIN;
-- Execution (after setup where User C has 50%):
SELECT public.monitor_tracker_battery_levels();

-- Assertion:
SELECT * FROM public.notifications
WHERE user_id = 'user_c_uuid' AND type = 'low_battery';
-- Expect 0 rows.
ROLLBACK;
```

**TC3: Below threshold, but unread notification exists (User B)**
```sql
BEGIN;
-- Setup: Insert an unread low_battery notification for User B
CALL public.insert_notification('user_b_uuid', NULL, 'low_battery', 'Low Battery', 'Battery very low!', '{"battery_level": 10}'::jsonb);
UPDATE public.notifications SET is_read = FALSE
  WHERE user_id = 'user_b_uuid' AND type = 'low_battery';
  -- Ensure it is unread, insert_notification defaults to false but good to be explicit.

-- Execution:
SELECT public.monitor_tracker_battery_levels(); -- User B still has 15% from common setup

-- Assertion: Check that no *new* notification was added. Count existing ones.
SELECT COUNT(*) FROM public.notifications
WHERE user_id = 'user_b_uuid' AND type = 'low_battery';
-- Expect 1 row (the one manually inserted). Check logs for "Skipping" message.
ROLLBACK;
```

**TC4: Below threshold, old *read* notification exists (User B)**
```sql
BEGIN;
-- Setup: Insert a *read* low_battery notification for User B
CALL public.insert_notification('user_b_uuid', NULL, 'low_battery', 'Old Low Battery', 'Battery was low.', '{"battery_level": 12}'::jsonb);
UPDATE public.notifications SET is_read = TRUE
  WHERE user_id = 'user_b_uuid' AND type = 'low_battery' AND title = 'Old Low Battery';

-- Execution:
SELECT public.monitor_tracker_battery_levels(); -- User B still has 15%

-- Assertion: A new notification should be created.
SELECT * FROM public.notifications
WHERE user_id = 'user_b_uuid' AND type = 'low_battery' AND is_read = FALSE
  AND message LIKE '%battery is at 15%%';
-- Expect 1 new unread notification. Total 2 for this user (1 read, 1 unread).
ROLLBACK;
```
---

## 4. Function: `public.schedule_match_reminders() RETURNS VOID`

### Function Signature:
`schedule_match_reminders() RETURNS VOID`

### Test Cases:
1.  **TC1: Match starting within reminder window (30-35 mins from now), user assigned.**
    -   Verify a 'match_reminder' notification is created for the assigned user.
2.  **TC2: Match starting outside reminder window (e.g., in 1 hour).**
    -   Verify no notification is created.
3.  **TC3: Match starting within window, but status is not 'published' (e.g., 'draft', 'completed').**
    -   Verify no notification is created.
4.  **TC4: Match starting within window, user assigned, but reminder already sent recently.**
    -   Verify no new notification is created (de-duplication).
5.  **TC5: Match starting within window, multiple users assigned.**
    -   Verify notifications are created for all assigned users (who haven't received one).
6.  **TC6: No matches in the upcoming window.**
    -   Verify function runs without error, no notifications created.
7.  **TC7: Match in window, but no trackers assigned.**
    -   Verify function runs, no notifications created for that match.

### Example SQL Snippets:

**Setup (Common): Users, Matches, Assignments**
```sql
-- User_b_uuid ('tracker_user@example.com')
-- Match_m_uuid ('Test Match M')
-- Match_n_uuid for another match

-- Clean previous test data
DELETE FROM public.notifications
  WHERE match_id IN ('match_m_uuid', 'match_n_uuid') OR user_id = 'user_b_uuid';
DELETE FROM public.match_tracker_assignments
  WHERE match_id IN ('match_m_uuid', 'match_n_uuid') OR tracker_id = 'user_b_uuid';
DELETE FROM public.matches WHERE id IN ('match_m_uuid', 'match_n_uuid');

-- Match M: Starts in 32 minutes, status 'published'
INSERT INTO public.matches (id, name, status, home_team_name, away_team_name, match_date)
VALUES ('match_m_uuid', 'Match M (In 32 Mins)', 'published', 'Team M1', 'Team M2', NOW() + INTERVAL '32 minutes');

-- Match N: Starts in 1 hour, status 'published'
INSERT INTO public.matches (id, name, status, home_team_name, away_team_name, match_date)
VALUES ('match_n_uuid', 'Match N (In 1 Hour)', 'published', 'Team N1', 'Team N2', NOW() + INTERVAL '1 hour');

-- Assign User B to Match M
INSERT INTO public.match_tracker_assignments (match_id, tracker_id)
VALUES ('match_m_uuid', 'user_b_uuid');
```

**TC1: Match M (in window), User B assigned**
```sql
BEGIN;
-- Execution:
SELECT public.schedule_match_reminders();

-- Assertion:
SELECT * FROM public.notifications
WHERE user_id = 'user_b_uuid' AND match_id = 'match_m_uuid' AND type = 'match_reminder';
-- Expect 1 row. Check message and data payload.
ROLLBACK;
```

**TC2: Match N (outside window)**
```sql
BEGIN;
-- Execution (User B also assigned to Match N for this test, or no one):
-- INSERT INTO public.match_tracker_assignments (match_id, tracker_id) VALUES ('match_n_uuid', 'user_b_uuid');
SELECT public.schedule_match_reminders();

-- Assertion:
SELECT * FROM public.notifications
WHERE match_id = 'match_n_uuid' AND type = 'match_reminder';
-- Expect 0 rows for Match N.
ROLLBACK;
```

**TC4: Reminder already sent for Match M to User B**
```sql
BEGIN;
-- Setup: Manually insert a reminder for Match M and User B
CALL public.insert_notification('user_b_uuid', 'match_m_uuid', 'match_reminder', 'Reminder', 'Msg', '{}'::jsonb);

-- Execution:
SELECT public.schedule_match_reminders();

-- Assertion: Count notifications for this user/match. Should still be 1 (the one inserted).
SELECT COUNT(*) FROM public.notifications
WHERE user_id = 'user_b_uuid' AND match_id = 'match_m_uuid' AND type = 'match_reminder';
-- Expect 1. Check logs for "Skipping" message.
ROLLBACK;
```
---

## 5. Function: `public.find_replacement_tracker(p_match_id UUID, p_absent_tracker_id UUID) RETURNS UUID`

### Function Signature:
`find_replacement_tracker(p_match_id UUID, p_absent_tracker_id UUID) RETURNS UUID`

### Test Cases:
1.  **TC1: Available 'tracker' role user exists, not absent, not assigned to this match.**
    -   Verify a `user_id` is returned.
2.  **TC2: No users with 'tracker' role available (all others are 'admin' or other roles).**
    -   Verify `NULL` is returned. (Requires `get_user_role` to be accurate).
3.  **TC3: All other 'tracker' role users are already assigned to this match.**
    -   Verify `NULL` is returned.
4.  **TC4: Only one other 'tracker' role user exists, and they are the `p_absent_tracker_id`.**
    -   Verify `NULL` is returned (as absent tracker is excluded).
5.  **TC5: Multiple potential replacements available.**
    -   Verify one `user_id` is returned. (Randomness makes it hard to predict which one, just that one is returned).

### Example SQL Snippets:

**Setup (Common): Users, Match, Assignments**
```sql
-- User_a_uuid (admin), User_b_uuid (tracker), User_c_uuid (no specific role or also tracker)
-- User_d_uuid (another tracker)
-- Match_m_uuid

-- Ensure roles are set (as per get_user_role setup)
-- User D: 'tracker' role
INSERT INTO auth.users (id, email, encrypted_password, raw_app_meta_data)
VALUES ('user_d_uuid', 'tracker_d@example.com', 'fakepassword', '{"role": "tracker"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET raw_app_meta_data = EXCLUDED.raw_app_meta_data;


-- Clean assignments for Match M
DELETE FROM public.match_tracker_assignments WHERE match_id = 'match_m_uuid';

-- Assign User B to Match M initially (User B will be the "absent" one in some tests)
INSERT INTO public.match_tracker_assignments (match_id, tracker_id)
VALUES ('match_m_uuid', 'user_b_uuid');
```

**TC1: User D is available as replacement for User B on Match M**
```sql
-- User B is absent. User D is a tracker, not assigned to Match M.
-- Execution & Assertion:
SELECT public.find_replacement_tracker('match_m_uuid', 'user_b_uuid');
-- Expected: 'user_d_uuid' (or another if more trackers exist and random picks them)
-- If get_user_role('user_c_uuid') is 'tracker', 'user_c_uuid' is also a candidate.
```

**TC3: All other trackers (User D) also assigned to Match M.**
```sql
BEGIN;
-- Assign User D to Match M as well
INSERT INTO public.match_tracker_assignments (match_id, tracker_id)
VALUES ('match_m_uuid', 'user_d_uuid');

-- Execution & Assertion: User B is absent for Match M.
SELECT public.find_replacement_tracker('match_m_uuid', 'user_b_uuid');
-- Expected: NULL (because User D, the only other tracker, is also on this match)
ROLLBACK;
```
---

## 6. Function: `public.check_tracker_activity() RETURNS VOID`

### Function Signature:
`check_tracker_activity() RETURNS VOID`

### Test Cases:
1.  **TC1: Assigned tracker in 'live' match becomes inactive (last_active_at too old).**
    -   Verify `find_replacement_tracker` is called.
    -   If replacement found, verify `handle_tracker_absence` is called (check for new notification to replacement).
2.  **TC2: Assigned tracker in 'live' match is active (last_active_at recent).**
    -   Verify no replacement actions are taken.
3.  **TC3: Assigned tracker in 'live' match has NO record in `match_tracker_activity`.**
    -   Verify they are treated as inactive, and replacement process is triggered.
4.  **TC4: Match is not 'live' (e.g., 'scheduled', 'completed').**
    -   Verify no activity checks are performed for trackers on this match.
5.  **TC5: Inactive tracker found, but `find_replacement_tracker` returns NULL (no replacements available).**
    -   Verify `handle_tracker_absence` is NOT called. Check logs for "No replacement found".
6.  **TC6: Multiple inactive trackers in multiple live matches.**
    -   Verify replacement process is attempted for all.

### Example SQL Snippets:

**Setup (Common): Users, Matches, Assignments, Activity**
```sql
-- User_b_uuid (tracker, will be assigned and become inactive)
-- User_d_uuid (tracker, potential replacement)
-- Match_live_uuid (a match that is 'live')

-- Create a 'live' match
DELETE FROM public.matches WHERE id = 'match_live_uuid'; -- Clean first
INSERT INTO public.matches (id, name, status, home_team_name, away_team_name, match_date)
VALUES ('match_live_uuid', 'Live Test Match', 'live', 'Team LiveA', 'Team LiveB', NOW() - INTERVAL '30 minutes');

-- Assign User B to this live match
DELETE FROM public.match_tracker_assignments WHERE match_id = 'match_live_uuid';
INSERT INTO public.match_tracker_assignments (match_id, tracker_id)
VALUES ('match_live_uuid', 'user_b_uuid');

-- Clear previous activity and notifications for these users/match
DELETE FROM public.match_tracker_activity WHERE match_id = 'match_live_uuid';
DELETE FROM public.notifications WHERE match_id = 'match_live_uuid' OR user_id IN ('user_b_uuid', 'user_d_uuid');
```

**TC1: User B becomes inactive on Match_live_uuid; User D is available.**
```sql
BEGIN;
-- Setup: User B's last activity was 5 minutes ago (threshold is 3 minutes)
INSERT INTO public.match_tracker_activity (match_id, user_id, last_active_at)
VALUES ('match_live_uuid', 'user_b_uuid', NOW() - INTERVAL '5 minutes');

-- Ensure User D is a tracker and NOT assigned to 'match_live_uuid' (done by common setup)

-- Execution:
SELECT public.check_tracker_activity();

-- Assertion:
-- 1. Notification sent to User D for replacement.
SELECT * FROM public.notifications
WHERE user_id = 'user_d_uuid'
  AND match_id = 'match_live_uuid'
  AND type = 'tracker_absence'
  AND (data->>'absent_tracker_id')::uuid = 'user_b_uuid'
  AND (data->>'replacement_tracker_id')::uuid = 'user_d_uuid';
-- Expect 1 row.
-- 2. Check logs for calls to find_replacement_tracker and handle_tracker_absence.
ROLLBACK;
```

**TC2: User B is active on Match_live_uuid.**
```sql
BEGIN;
-- Setup: User B's last activity was 1 minute ago
INSERT INTO public.match_tracker_activity (match_id, user_id, last_active_at)
VALUES ('match_live_uuid', 'user_b_uuid', NOW() - INTERVAL '1 minute');

-- Execution:
SELECT public.check_tracker_activity();

-- Assertion: No 'tracker_absence' notification should be created for User D (or anyone else for this scenario).
SELECT * FROM public.notifications WHERE type = 'tracker_absence' AND match_id = 'match_live_uuid';
-- Expect 0 rows. Check logs for "is active" message.
ROLLBACK;
```

**TC3: User B has no record in `match_tracker_activity` for Match_live_uuid.**
```sql
BEGIN;
-- Setup: No activity record for User B in 'match_live_uuid' (ensure it by deleting if exists)
DELETE FROM public.match_tracker_activity
  WHERE match_id = 'match_live_uuid' AND user_id = 'user_b_uuid';

-- Execution:
SELECT public.check_tracker_activity();

-- Assertion: Same as TC1 - User B treated as inactive, User D gets notification.
SELECT * FROM public.notifications
WHERE user_id = 'user_d_uuid' AND match_id = 'match_live_uuid' AND type = 'tracker_absence';
-- Expect 1 row.
ROLLBACK;
```
---

## 7. Function: `public.handle_tracker_absence(p_absent_tracker_user_id UUID, p_match_id UUID, p_replacement_tracker_user_id UUID)`

### Function Signature:
`handle_tracker_absence(p_absent_tracker_user_id UUID, p_match_id UUID, p_replacement_tracker_user_id UUID)`

### Test Cases:
1.  **TC1: Valid inputs for absent tracker, match, and replacement tracker.**
    -   Verify a 'tracker_absence' notification is created for the `p_replacement_tracker_user_id`.
    -   Verify the notification `data` payload contains `match_id`, `absent_tracker_id`, and `replacement_tracker_id`.
2.  **TC2: `p_absent_tracker_user_id` is NULL.**
    -   Verify function exits early (logs warning), no notification created.
3.  **TC3: `p_match_id` is NULL.**
    -   Verify function exits early, no notification created.
4.  **TC4: `p_replacement_tracker_user_id` is NULL.**
    -   Verify function exits early, no notification created.

### Example SQL Snippets:

**Setup (Common): Users and Match**
```sql
-- user_b_uuid (absent), user_d_uuid (replacement)
-- match_m_uuid
DELETE FROM public.notifications WHERE type = 'tracker_absence'; -- Clear previous test notifications
```

**TC1: Valid inputs**
```sql
BEGIN;
-- Execution:
SELECT public.handle_tracker_absence('user_b_uuid', 'match_m_uuid', 'user_d_uuid');

-- Assertion:
SELECT * FROM public.notifications
WHERE user_id = 'user_d_uuid'
  AND match_id = 'match_m_uuid'
  AND type = 'tracker_absence'
  AND (data->>'absent_tracker_id')::uuid = 'user_b_uuid'
  AND (data->>'replacement_tracker_id')::uuid = 'user_d_uuid'
  AND (data->>'match_id')::uuid = 'match_m_uuid';
-- Expect 1 row. Check message content too.
ROLLBACK;
```

**TC2: `p_absent_tracker_user_id` is NULL**
```sql
BEGIN;
-- Execution:
SELECT public.handle_tracker_absence(NULL, 'match_m_uuid', 'user_d_uuid');

-- Assertion:
SELECT * FROM public.notifications WHERE type = 'tracker_absence';
-- Expect 0 rows. Check logs for warning.
ROLLBACK;
```

---
**End of Test Plan**
```
