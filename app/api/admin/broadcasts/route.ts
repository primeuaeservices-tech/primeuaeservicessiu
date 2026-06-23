import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET() {
    const { error } = await requireAdmin();
    if (error) return error;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });

    try {
        const resend = new Resend(resendKey);
        const { data, error: resendError } = await resend.broadcasts.list();
        if (resendError) return NextResponse.json({ error: resendError.message }, { status: 500 });
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: NextRequest) {
    const { error } = await requireAdmin();
    if (error) return error;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });

    try {
        const body = await request.json();
        const { subject, html, segmentId, from = 'Prime UAE Services <noreply@primeuaeservices.com>' } = body;

        if (!subject || !html) {
            return NextResponse.json({ error: 'Subject and HTML content are required' }, { status: 400 });
        }

        const resend = new Resend(resendKey);
        const { data, error: resendError } = await resend.broadcasts.create({ from, subject, html, segmentId });
        if (resendError) return NextResponse.json({ error: resendError.message }, { status: 500 });
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
