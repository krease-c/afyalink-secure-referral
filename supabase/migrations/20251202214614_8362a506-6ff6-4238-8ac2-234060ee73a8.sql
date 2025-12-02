-- Add new roles to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'pharmacist';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab_technician';

-- Insert FAQs
INSERT INTO public.faqs (question, answer, category, order_index, is_published) VALUES
('What is a healthcare referral?', 'A referral is when a doctor sends you to a specialist or another healthcare service for further care.', 'general', 1, true),
('Why do I need a referral?', 'To ensure you see the right specialist and for insurance coverage.', 'general', 2, true),
('How do I get a referral?', 'Ask your primary care provider; they issue one after evaluating your condition.', 'general', 3, true),
('How long does a referral take to process?', 'Usually 1–3 business days.', 'general', 4, true),
('Is patient consent required?', 'Yes. The referring provider must inform the patient and obtain consent for electronic data transfer.', 'general', 5, true),
('Can the system operate across counties or regions?', 'Yes. With proper access control and network integration, the system can support inter-county referrals, share standardized referral forms, and coordinate national referral workflows.', 'general', 6, true);

-- Insert facilities by level
INSERT INTO public.facilities (name, type, address, level_id, status) VALUES
-- Level 6
('Kenyatta National Hospital', 'National Referral Hospital', 'Nairobi', (SELECT id FROM facility_levels WHERE level = 6), 'active'),
('Kenyatta University Teaching, Referral, and Research Hospital', 'Teaching Hospital', 'Nairobi', (SELECT id FROM facility_levels WHERE level = 6), 'active'),
('Moi Teaching and Referral Hospital', 'Teaching Hospital', 'Eldoret', (SELECT id FROM facility_levels WHERE level = 6), 'active'),
-- Level 5
('Nairobi Hospital', 'County Referral Hospital', 'Nairobi', (SELECT id FROM facility_levels WHERE level = 5), 'active'),
('Coast General Hospital', 'County Referral Hospital', 'Mombasa', (SELECT id FROM facility_levels WHERE level = 5), 'active'),
('Embu Level 5 Hospital', 'County Referral Hospital', 'Embu', (SELECT id FROM facility_levels WHERE level = 5), 'active'),
('Nakuru Level 5 Hospital', 'County Referral Hospital', 'Nakuru', (SELECT id FROM facility_levels WHERE level = 5), 'active'),
-- Level 4
('Mama Lucy Kibaki Hospital', 'Sub-County Hospital', 'Nairobi', (SELECT id FROM facility_levels WHERE level = 4), 'active'),
('St. Mary''s Mission Hospital, Nairobi', 'Sub-County Hospital', 'Nairobi', (SELECT id FROM facility_levels WHERE level = 4), 'active'),
('Narok County Referral Hospital', 'Sub-County Hospital', 'Narok', (SELECT id FROM facility_levels WHERE level = 4), 'active'),
('Busia County Referral Hospital', 'Sub-County Hospital', 'Busia', (SELECT id FROM facility_levels WHERE level = 4), 'active'),
-- Level 3
('Jacaranda Maternity Clinic', 'Health Centre', 'Nairobi', (SELECT id FROM facility_levels WHERE level = 3), 'active'),
('NKUBU MEDICARE MEDICAL CENTRE', 'Health Centre', 'Meru', (SELECT id FROM facility_levels WHERE level = 3), 'active'),
('KIRINDINE MUTETHIA MATERNITY & NURSING HOME', 'Health Centre', 'Meru', (SELECT id FROM facility_levels WHERE level = 3), 'active'),
('KEMU MEDICAL CENTRE', 'Health Centre', 'Meru', (SELECT id FROM facility_levels WHERE level = 3), 'active'),
-- Level 2
('MIKINDURI INTEGRATED RURAL MEDICAL CLINIC', 'Dispensary', 'Meru', (SELECT id FROM facility_levels WHERE level = 2), 'active'),
('LEWA WILDLIFE CONSERVANCY MEDICAL CLINIC', 'Dispensary', 'Meru', (SELECT id FROM facility_levels WHERE level = 2), 'active'),
('MAKUTANO MEDICAL HEALTH CLINIC', 'Dispensary', 'Meru', (SELECT id FROM facility_levels WHERE level = 2), 'active'),
('LANS MEDICAL CLINIC', 'Dispensary', 'Meru', (SELECT id FROM facility_levels WHERE level = 2), 'active'),
-- Level 1
('Kosirai Community Unit', 'Community Unit', 'Nandi', (SELECT id FROM facility_levels WHERE level = 1), 'active'),
('Kiaumbui Dispensary (Gichugu)', 'Community Unit', 'Kirinyaga', (SELECT id FROM facility_levels WHERE level = 1), 'active');