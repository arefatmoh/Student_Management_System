-- Add PROFILE_PICTURE column to Users table
ALTER TABLE Users ADD COLUMN PROFILE_PICTURE VARCHAR(255) NULL;

-- Add index for better performance
CREATE INDEX idx_users_profile_picture ON Users(PROFILE_PICTURE);
