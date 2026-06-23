import { createClient } from '@supabase/supabase-js';

export interface SiteSettings {
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
}

export const DEFAULT_SETTINGS: SiteSettings = {
  phone: '+971 52 770 7492',
  whatsapp: '971527707492',
  email: 'info@primeuaeservices.com',
  address: 'Al Qusais, Dubai, UAE',
};

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) return DEFAULT_SETTINGS;

    const client = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await client
      .from('site_settings')
      .select('phone, whatsapp, email, address')
      .eq('id', 'main')
      .single();

    if (error || !data) return DEFAULT_SETTINGS;

    return {
      phone: data.phone || DEFAULT_SETTINGS.phone,
      whatsapp: data.whatsapp || DEFAULT_SETTINGS.whatsapp,
      email: data.email || DEFAULT_SETTINGS.email,
      address: data.address || DEFAULT_SETTINGS.address,
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}
