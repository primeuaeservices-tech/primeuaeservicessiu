import { createServerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function requireAdmin() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Route handler — setAll is best-effort
            }
          },
        },
      }
    );

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
    }
    return { session, error: null };
  } catch {
    return { session: null, error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
}

export const ADMIN_EMAIL = () =>
  process.env.ADMIN_NOTIFICATION_EMAIL || 'primeuaeservices@gmail.com';

export const FROM_EMAIL = () =>
  process.env.RESEND_FROM_EMAIL || 'Prime UAE Services <noreply@primeuaeservices.com>';
