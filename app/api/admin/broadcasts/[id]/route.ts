import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireAdmin } from '@/lib/admin-auth';

function getResend() {
    const key = process.env.RESEND_API_KEY;
    if (!key) throw new Error('RESEND_API_KEY is not configured');
    return new Resend(key);
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await requireAdmin(request);
    if (error) return error;
    try {
        const { data, error: e } = await getResend().broadcasts.get(params.id);
        if (e) return NextResponse.json({ error: e }, { status: 500 });
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await requireAdmin(request);
    if (error) return error;
    try {
        const { data, error: e } = await getResend().broadcasts.remove(params.id);
        if (e) return NextResponse.json({ error: e }, { status: 500 });
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
    const { error } = await requireAdmin(request);
    if (error) return error;
    try {
        const body = await request.json();
        const options: any = {};
        if (body.subject) options.subject = body.subject;
        if (body.html) options.html = body.html;
        const { data, error: e } = await getResend().broadcasts.update(params.id, options);
        if (e) return NextResponse.json({ error: e }, { status: 500 });
        return NextResponse.json({ data });
    } catch (error: any) {
        return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
    }
}
