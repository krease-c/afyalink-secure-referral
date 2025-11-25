-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'doctor', 'nurse', 'patient');

-- Create enum for referral status
CREATE TYPE public.referral_status AS ENUM ('pending', 'accepted', 'in_progress', 'completed', 'rejected');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Create registration_codes table
CREATE TABLE public.registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  role public.app_role NOT NULL,
  max_uses INTEGER,
  uses_count INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

-- Create referrals table
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referring_doctor_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  assigned_doctor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_nurse_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  facility_from TEXT NOT NULL,
  facility_to TEXT NOT NULL,
  reason TEXT NOT NULL,
  diagnosis TEXT,
  urgency TEXT NOT NULL CHECK (urgency IN ('low', 'medium', 'high', 'critical')),
  status public.referral_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check user roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create security definer function to get user roles
CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS SETOF public.app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

-- Create function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Insert profile
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User')
  );

  -- Check if this is the first user
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  IF user_count = 1 THEN
    -- First user becomes admin
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'admin');
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
$$;

-- Create trigger for new user
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors and nurses can view patient profiles"
  ON public.profiles FOR SELECT
  USING (
    public.has_role(auth.uid(), 'doctor') OR
    public.has_role(auth.uid(), 'nurse')
  );

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
  ON public.user_roles FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for registration_codes
CREATE POLICY "Anyone can view active codes for registration"
  ON public.registration_codes FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage registration codes"
  ON public.registration_codes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for referrals
CREATE POLICY "Patients can view their own referrals"
  ON public.referrals FOR SELECT
  USING (auth.uid() = patient_id);

CREATE POLICY "Doctors can view referrals they created or are assigned to"
  ON public.referrals FOR SELECT
  USING (
    auth.uid() = referring_doctor_id OR
    auth.uid() = assigned_doctor_id OR
    public.has_role(auth.uid(), 'doctor')
  );

CREATE POLICY "Nurses can view referrals they are assigned to"
  ON public.referrals FOR SELECT
  USING (
    auth.uid() = assigned_nurse_id OR
    public.has_role(auth.uid(), 'nurse')
  );

CREATE POLICY "Admins can view all referrals"
  ON public.referrals FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Doctors can create referrals"
  ON public.referrals FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'doctor') AND
    auth.uid() = referring_doctor_id
  );

CREATE POLICY "Doctors can update their referrals"
  ON public.referrals FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'doctor') AND
    (auth.uid() = referring_doctor_id OR auth.uid() = assigned_doctor_id)
  );

CREATE POLICY "Nurses can update assigned referrals"
  ON public.referrals FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'nurse') AND
    auth.uid() = assigned_nurse_id
  );

CREATE POLICY "Admins can manage all referrals"
  ON public.referrals FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- Insert default registration codes
INSERT INTO public.registration_codes (code, role, is_active) VALUES
  ('DOCTOR2024', 'doctor', true),
  ('NURSE2024', 'nurse', true),
  ('PATIENT2024', 'patient', true);