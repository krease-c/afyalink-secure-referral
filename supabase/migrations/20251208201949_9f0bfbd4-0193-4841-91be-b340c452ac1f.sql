-- Add status column to profiles table for admin approval workflow
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Update existing profiles to be active (so current users aren't locked out)
UPDATE public.profiles SET status = 'active' WHERE status IS NULL OR status = 'pending';

-- Update handle_new_user function to set new users as pending
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_count INTEGER;
BEGIN
  -- Insert profile with pending status
  INSERT INTO public.profiles (id, email, full_name, status)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    'pending'
  );

  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  IF user_count = 1 THEN
    -- First user becomes admin and is automatically active
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
    
    UPDATE public.profiles SET status = 'active' WHERE id = NEW.id;
  ELSE
    -- Assign role based on registration code if provided
    IF NEW.raw_user_meta_data->>'registration_code' IS NOT NULL THEN
      INSERT INTO public.user_roles (user_id, role)
      SELECT NEW.id, rc.role
      FROM public.registration_codes rc
      WHERE rc.code = NEW.raw_user_meta_data->>'registration_code'
        AND rc.is_active = true
        AND (rc.max_uses IS NULL OR rc.uses_count < rc.max_uses)
        AND (rc.expires_at IS NULL OR rc.expires_at > now());
      
      -- Increment use count
      UPDATE public.registration_codes
      SET uses_count = uses_count + 1
      WHERE code = NEW.raw_user_meta_data->>'registration_code';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;