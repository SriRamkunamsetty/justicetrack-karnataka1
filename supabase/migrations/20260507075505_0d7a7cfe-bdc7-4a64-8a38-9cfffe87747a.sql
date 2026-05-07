ALTER TABLE public.extracted_fields ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE public.directives ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open';