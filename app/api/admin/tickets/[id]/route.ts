import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { requireAdmin } from '@/lib/admin-auth';

function getSupabase() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase credentials missing');
    return createClient(url, key);
}

// PATCH - Edit ticket info
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    try {
        const body = await request.json();
        const allowedFields = ['name', 'email', 'phone', 'service', 'message', 'status', 'priority', 'notes', 'follow_up_date', 'estimated_value', 'lead_score'];

        const updates: Record<string, any> = {};
        for (const field of allowedFields) {
            if (body[field] !== undefined) {
                updates[field] = body[field];
            }
        }

        if (Object.keys(updates).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }

        const supabase = getSupabase();
        const { data, error } = await supabase
            .from('tickets')
            .update(updates)
            .eq('id', params.id)
            .select()
            .single();

        if (error) throw error;

        return NextResponse.json({ success: true, data });
    } catch (error: any) {
        console.error('Error updating ticket:', error);
        return NextResponse.json({ error: error.message || 'Failed to update ticket' }, { status: 500 });
    }
}

// DELETE - Delete ticket
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const { error: authError } = await requireAdmin();
    if (authError) return authError;

    try {
        const supabase = getSupabase();
        const { error } = await supabase
            .from('tickets')
            .delete()
            .eq('id', params.id);

        if (error) throw error;

        return NextResponse.json({ success: true, message: 'Ticket deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting ticket:', error);
        return NextResponse.json({ error: error.message || 'Failed to delete ticket' }, { status: 500 });
    }
}
