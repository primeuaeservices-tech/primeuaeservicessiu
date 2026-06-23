-- =============================================
-- Run this SQL in your Supabase SQL Editor
-- Dashboard -> SQL Editor -> New Query
-- =============================================

-- Create site_settings table
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'main',
  phone TEXT NOT NULL DEFAULT '+971 52 770 7492',
  whatsapp TEXT NOT NULL DEFAULT '971527707492',
  email TEXT NOT NULL DEFAULT 'info@primeuaeservices.com',
  address TEXT NOT NULL DEFAULT 'Al Qusais, Dubai, UAE',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read (so website can display contact info)
CREATE POLICY "Public can read site_settings"
  ON public.site_settings
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only logged-in admin can update
CREATE POLICY "Authenticated can modify site_settings"
  ON public.site_settings
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert default row with current contact details
INSERT INTO public.site_settings (id, phone, whatsapp, email, address)
VALUES (
  'main',
  '+971 52 770 7492',
  '971527707492',
  'info@primeuaeservices.com',
  'Al Qusais, Dubai, UAE'
)
ON CONFLICT (id) DO NOTHING;
