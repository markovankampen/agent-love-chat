DROP TRIGGER IF EXISTS sync_profiles_to_external ON profiles;
DROP TRIGGER IF EXISTS sync_conversations_to_external ON conversations;
DROP TRIGGER IF EXISTS sync_face_analysis_to_external ON face_analysis;
DROP TRIGGER IF EXISTS sync_notification_settings_to_external ON notification_settings;
DROP TRIGGER IF EXISTS sync_matches_to_external ON matches;
DROP TRIGGER IF EXISTS sync_email_verification_tokens_to_external ON email_verification_tokens;
DROP TRIGGER IF EXISTS sync_user_roles_to_external ON user_roles;
DROP TRIGGER IF EXISTS sync_user_activity_to_external ON user_activity;