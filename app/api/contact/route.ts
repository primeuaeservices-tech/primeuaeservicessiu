import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Resend } from 'resend';
import React from 'react';
import { ContactEmail } from '@/components/email-templates/ContactEmail';
import { ADMIN_EMAIL, FROM_EMAIL } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, email, phone, service, message } = body;

        if (!name || !email || !phone || !message) {
            return NextResponse.json(
                { message: 'Missing required fields' },
                { status: 400 }
            );
        }

        // 1. Save to Supabase
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { error: dbError } = await supabase
                .from('tickets')
                .insert([{
                    name, email, phone, service, message,
                    status: 'open',
                    source: 'website_contact_form',
                    created_at: new Date().toISOString(),
                }]);

            if (dbError) console.error('Supabase error:', dbError);
        }

        // 2. Send Email Notification via Resend
        const resendKey = process.env.RESEND_API_KEY;
        if (resendKey) {
            try {
                const resend = new Resend(resendKey);
                await resend.emails.send({
                    from: FROM_EMAIL(),
                    to: [ADMIN_EMAIL()],
                    replyTo: email,
                    subject: `New Inquiry: ${name} - ${service || 'General'}`,
                    react: React.createElement(ContactEmail, {
                        name, email, phone,
                        service: service || 'General',
                        message
                    }),
                });
            } catch (err) {
                console.error('Resend email error:', err);
            }
        }

        // 3. Trigger ticket notification
        try {
            const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
            await fetch(`${siteUrl}/api/edge/ticket-notification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, phone, service, message, status: 'open', source: 'website_contact_form' }),
            });
        } catch {
            // Silent fail - notification is optional
        }

        return NextResponse.json({
            success: true,
            message: 'Thank you for your message. We will contact you soon.',
        }, { status: 200 });
    } catch (error) {
        console.error('Contact form error:', error);
        return NextResponse.json(
            { message: 'An error occurred. Please try again later.' },
            { status: 500 }
        );
    }
}
