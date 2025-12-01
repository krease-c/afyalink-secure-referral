-- Fix critical RLS security issues first
-- 1. Remove public access to registration_codes
DROP POLICY IF EXISTS "Anyone can view active codes for registration" ON public.registration_codes;

-- 2. Fix doctor referral access - remove overly permissive clause
DROP POLICY IF EXISTS "Doctors can view referrals they created or are assigned to" ON public.referrals;
CREATE POLICY "Doctors can view referrals they created or are assigned to"
ON public.referrals
FOR SELECT
TO authenticated
USING (
  auth.uid() = referring_doctor_id OR 
  auth.uid() = assigned_doctor_id
);

-- 3. Fix nurse referral access - remove overly permissive clause
DROP POLICY IF EXISTS "Nurses can view referrals they are assigned to" ON public.referrals;
CREATE POLICY "Nurses can view referrals they are assigned to"
ON public.referrals
FOR SELECT
TO authenticated
USING (auth.uid() = assigned_nurse_id);

-- Add pharmacist role to enum
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'pharmacist';

-- Create facility levels table
CREATE TABLE IF NOT EXISTS public.facility_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  level INTEGER NOT NULL UNIQUE CHECK (level >= 1 AND level <= 6),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create facilities table
CREATE TABLE IF NOT EXISTS public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  level_id UUID REFERENCES public.facility_levels(id),
  address TEXT,
  phone TEXT,
  email TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  rating DECIMAL(2,1) DEFAULT 0.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create medical staff table
CREATE TABLE IF NOT EXISTS public.medical_staff (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  staff_type TEXT NOT NULL CHECK (staff_type IN ('doctor', 'nurse', 'pharmacist')),
  specialty TEXT,
  license_number TEXT,
  facility_id UUID REFERENCES public.facilities(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, staff_type)
);

-- Create feedback table
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'bug', 'feature', 'complaint')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Create FAQ table
CREATE TABLE IF NOT EXISTS public.faqs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  order_index INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS on all new tables
ALTER TABLE public.facility_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faqs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for facility_levels
CREATE POLICY "Everyone can view facility levels"
ON public.facility_levels FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage facility levels"
ON public.facility_levels FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for facilities
CREATE POLICY "Everyone can view facilities"
ON public.facilities FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage facilities"
ON public.facilities FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for medical_staff
CREATE POLICY "Admins can view all medical staff"
ON public.medical_staff FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own staff record"
ON public.medical_staff FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Doctors and nurses can view medical staff"
ON public.medical_staff FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'doctor') OR 
  has_role(auth.uid(), 'nurse')
);

CREATE POLICY "Admins can manage medical staff"
ON public.medical_staff FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create feedback"
ON public.feedback FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all feedback"
ON public.feedback FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage feedback"
ON public.feedback FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for FAQs
CREATE POLICY "Everyone can view published FAQs"
ON public.faqs FOR SELECT TO authenticated
USING (is_published = true);

CREATE POLICY "Admins can manage FAQs"
ON public.faqs FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Create triggers for updated_at
CREATE TRIGGER update_facility_levels_updated_at
  BEFORE UPDATE ON public.facility_levels
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_facilities_updated_at
  BEFORE UPDATE ON public.facilities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_staff_updated_at
  BEFORE UPDATE ON public.medical_staff
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_faqs_updated_at
  BEFORE UPDATE ON public.faqs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default facility levels
INSERT INTO public.facility_levels (name, level, description) VALUES
  ('Level 1 - Community Health', 1, 'Community health units and dispensaries providing basic healthcare'),
  ('Level 2 - Dispensary', 2, 'Primary care dispensaries with basic diagnostic services'),
  ('Level 3 - Health Centre', 3, 'Health centres with inpatient services and laboratory'),
  ('Level 4 - Primary Hospital', 4, 'Sub-county hospitals with basic surgical services'),
  ('Level 5 - Secondary Hospital', 5, 'County referral hospitals with specialized services'),
  ('Level 6 - Tertiary Hospital', 6, 'National referral and teaching hospitals')
ON CONFLICT (level) DO NOTHING;