-- Allow patients to view profiles of doctors/nurses involved in their referrals
CREATE POLICY "Patients can view profiles of staff in their referrals"
ON public.profiles
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.referrals r
    WHERE r.patient_id = auth.uid()
    AND (
      r.referring_doctor_id = profiles.id
      OR r.assigned_doctor_id = profiles.id
      OR r.assigned_nurse_id = profiles.id
    )
  )
);