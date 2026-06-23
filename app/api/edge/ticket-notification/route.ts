import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { ADMIN_EMAIL, FROM_EMAIL } from '@/lib/admin-auth';

export async function POST(request: NextRequest) {
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      console.warn('⚠️ RESEND_API_KEY not set - skipping notification');
      return NextResponse.json({ success: true, message: 'Notification skipped - email not configured' });
    }

    const body = await request.json();
    const ticket = body.record || body;

    if (!ticket.name || !ticket.email) {
      return NextResponse.json({ error: 'Invalid ticket data' }, { status: 400 });
    }

    const resend = new Resend(resendKey);
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL(),
      to: [ADMIN_EMAIL()],
      subject: `New Inquiry: ${ticket.name} - ${ticket.service || 'General'}`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
          <h2 style="color: #0A4D94;">New Contact Form Submission</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p><strong>Name:</strong> ${ticket.name}</p>
            <p><strong>Email:</strong> <a href="mailto:${ticket.email}">${ticket.email}</a></p>
            <p><strong>Phone:</strong> <a href="tel:${ticket.phone}">${ticket.phone}</a></p>
            <p><strong>Service:</strong> ${ticket.service || 'Not specified'}</p>
          </div>
          <div style="margin: 20px 0;">
            <p><strong>Message:</strong></p>
            <p style="background: white; padding: 15px; border-left: 4px solid #0A4D94; border-radius: 4px;">${ticket.message}</p>
          </div>
        </div>
      `,
      replyTo: ticket.email,
    });

    if (error) throw error;

    return NextResponse.json({ success: true, message: 'Notification sent', emailId: data?.id });
  } catch (error: any) {
    console.error('Error sending notification:', error);
    return NextResponse.json({ error: error.message || 'Failed to send notification' }, { status: 500 });
  }
}
