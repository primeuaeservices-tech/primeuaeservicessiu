import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/admin-auth';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await requireAdmin();
    if (error) return error;

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return NextResponse.json({ error: 'RESEND_API_KEY is not configured' }, { status: 500 });

    try {
        const resend = new Resend(resendKey);
        const { data, error: resendError } = await resend.broadcasts.send(params.id);
        if (resendError) return NextResponse.json({ error: resendError }, { status: 500 });
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
