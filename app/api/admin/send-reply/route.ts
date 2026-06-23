import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin, FROM_EMAIL } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
    const { error: authError } = await requireAdmin(request);
    if (authError) return authError;

    try {
        const body = await request.json();
        const { ticketId, to, subject, message, customerName } = body;

        if (!to || !subject || !message) {
            return NextResponse.json(
                { error: 'Missing required fields: to, subject, message' },
                { status: 400 }
            );
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return NextResponse.json({ error: 'Invalid email address format' }, { status: 400 });
        }

        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) {
            return NextResponse.json(
                { error: 'Email service is not configured. Please set RESEND_API_KEY.' },
                { status: 500 }
            );
        }

        const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'primeuaeservices@gmail.com';

        const emailHtml = `
            <!DOCTYPE html>
            <html>
            <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                    <h1 style="color: #EAB308; margin: 0; font-size: 28px;">Prime UAE Services</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #E2E8F0; border-top: none;">
                    <p style="font-size: 16px; margin-bottom: 20px;">Dear ${customerName || 'Valued Customer'},</p>
                    <div style="background: #F8FAFC; padding: 20px; border-radius: 8px; border-left: 4px solid #EAB308; margin: 20px 0;">
                        ${message.split('\n').map((line: string) => `<p style="margin: 10px 0;">${line}</p>`).join('')}
                    </div>
                    <p style="margin-top: 30px; font-size: 14px; color: #64748B;">If you have any further questions, please don't hesitate to contact us.</p>
                </div>
                <div style="background: #F8FAFC; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; border: 1px solid #E2E8F0; border-top: none;">
                    <p style="margin: 0; font-size: 12px; color: #94A3B8;">
                        <strong>Prime UAE Services</strong><br>
                        &copy; ${new Date().getFullYear()} Prime UAE Services. All rights reserved.
                    </p>
                </div>
            </body>
            </html>
        `;

        const resend = new Resend(resendKey);
        const { data, error } = await resend.emails.send({
            from: FROM_EMAIL(),
            to: [to],
            replyTo: adminEmail,
            subject,
            html: emailHtml,
        });

        if (error) {
            return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
        }

        // Update ticket notes
        if (ticketId) {
            const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
            const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (supabaseUrl && supabaseKey) {
                const supabase = createClient(supabaseUrl, supabaseKey);
                const replyNote = `\n\n[Reply sent on ${new Date().toLocaleString()}] ${subject}\nMessage: ${message}`;
                const { data: ticket } = await supabase
                    .from('tickets').select('notes').eq('id', ticketId).single();
                await supabase
                    .from('tickets')
                    .update({ notes: (ticket?.notes || '') + replyNote })
                    .eq('id', ticketId);
            }
        }

        return NextResponse.json({ success: true, message: 'Reply sent successfully', emailId: data?.id });
    } catch (error: any) {
        console.error('Error sending reply:', error);
        return NextResponse.json({ error: error.message || 'Failed to send reply' }, { status: 500 });
    }
}
