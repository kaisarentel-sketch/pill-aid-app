CREATE POLICY "Anyone can update medications"
ON public.medications
FOR UPDATE
USING (true)
WITH CHECK (true);