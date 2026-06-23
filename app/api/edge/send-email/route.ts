import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { FROM_EMAIL } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });
    }

    const { to, subject, html, from, replyTo } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: 'Missing required fields: to, subject, html' },
        { status: 400 }
      );
    }

    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from: from || FROM_EMAIL(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
      replyTo: replyTo || undefined,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, messageId: data?.id });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: error.message || 'Failed to send email' }, { status: 500 });
  }
}
