
CREATE TABLE public.medications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  active_ingredient TEXT NOT NULL,
  expiration_date TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view medications"
  ON public.medications FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert medications"
  ON public.medications FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete medications"
  ON public.medications FOR DELETE
  USING (true);
