-- =====================================================
-- Fix Profile Creation Trigger
-- =====================================================

-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS create_profile_trigger ON auth.users;
DROP FUNCTION IF EXISTS create_user_profile();

-- Create a corrected profile creation function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, full_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),  -- Use NULL instead of empty string
        NULLIF(NEW.raw_user_meta_data->>'avatar_url', '')  -- Use NULL instead of empty string
    );
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and continue (don't fail user creation)
        RAISE LOG 'Profile creation failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER create_profile_trigger
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION create_user_profile();

-- Also fix the update function to use NULLIF
CREATE OR REPLACE FUNCTION update_user_profile()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET 
        email = NEW.email,
        full_name = COALESCE(NULLIF(NEW.raw_user_meta_data->>'full_name', ''), profiles.full_name),
        avatar_url = COALESCE(NULLIF(NEW.raw_user_meta_data->>'avatar_url', ''), profiles.avatar_url),
        updated_at = NOW()
    WHERE id = NEW.id;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log the error and continue
        RAISE LOG 'Profile update failed for user %: %', NEW.id, SQLERRM;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
