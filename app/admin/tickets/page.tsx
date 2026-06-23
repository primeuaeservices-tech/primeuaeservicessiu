
'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Loader2, RefreshCw, Eye, Mail, Phone, Calendar, FileText, Search, Filter, AlertTriangle, Flag, DollarSign, StickyNote, Send, MessageCircle, Pencil, Trash2, X, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { adminFetch } from '@/lib/admin-fetch';

type Ticket = {
    id: number;
    created_at: string;
    name: string;
    email: string;
    phone: string;
    service: string;
    message: string;
    status: 'open' | 'closed' | 'pending';
    source: string;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    assigned_to?: string;
    follow_up_date?: string;
    estimated_value?: number;
    notes?: string;
    lead_score?: number;
};

type EditForm = {
    name: string;
    email: string;
    phone: string;
    service: string;
    message: string;
};

export default function TicketsPage() {
    const [tickets, setTickets] = useState<Ticket[]>([]);
    const [allTickets, setAllTickets] = useState<Ticket[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [priorityFilter, setPriorityFilter] = useState<string>('all');
    const [editingNotes, setEditingNotes] = useState<string>('');
    const [replySubject, setReplySubject] = useState<string>('');
    const [replyMessage, setReplyMessage] = useState<string>('');
    const [sendingReply, setSendingReply] = useState(false);
    const [showReplyForm, setShowReplyForm] = useState(false);

    // Edit state
    const [isEditMode, setIsEditMode] = useState(false);
    const [editForm, setEditForm] = useState<EditForm>({ name: '', email: '', phone: '', service: '', message: '' });
    const [savingEdit, setSavingEdit] = useState(false);

    // Delete state
    const [deleteTarget, setDeleteTarget] = useState<Ticket | null>(null);
    const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const fetchTickets = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('tickets')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching tickets:', error);
        } else {
            setAllTickets(data || []);
            setTickets(data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        let filtered = [...allTickets];
        if (statusFilter !== 'all') filtered = filtered.filter(t => t.status === statusFilter);
        if (priorityFilter !== 'all') filtered = filtered.filter(t => t.priority === priorityFilter);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.name.toLowerCase().includes(q) ||
                t.email.toLowerCase().includes(q) ||
                t.phone.toLowerCase().includes(q) ||
                (t.service && t.service.toLowerCase().includes(q)) ||
                t.message.toLowerCase().includes(q)
            );
        }
        setTickets(filtered);
    }, [searchQuery, statusFilter, priorityFilter, allTickets]);

    useEffect(() => {
        fetchTickets();
        const channel = supabase
            .channel('tickets-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, fetchTickets)
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, []);

    const updateStatus = async (id: number, newStatus: string) => {
        const { error } = await supabase.from('tickets').update({ status: newStatus }).eq('id', id);
        if (error) { console.error('Error updating status:', error); return; }
        fetchTickets();
        if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, status: newStatus as any });
    };

    const updatePriority = async (id: number, newPriority: string) => {
        const { error } = await supabase.from('tickets').update({ priority: newPriority }).eq('id', id);
        if (error) { console.error('Error updating priority:', error); return; }
        fetchTickets();
        if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, priority: newPriority as any });
    };

    const updateNotes = async (id: number, notes: string) => {
        const { error } = await supabase.from('tickets').update({ notes }).eq('id', id);
        if (error) { console.error('Error updating notes:', error); return; }
        fetchTickets();
        if (selectedTicket?.id === id) setSelectedTicket({ ...selectedTicket, notes });
    };

    const handleEditTicket = async () => {
        if (!selectedTicket) return;
        if (!editForm.name.trim() || !editForm.email.trim() || !editForm.phone.trim()) {
            toast.error('Name, email, and phone are required');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(editForm.email)) {
            toast.error('Invalid email address');
            return;
        }
        setSavingEdit(true);
        try {
            const response = await adminFetch(`/api/admin/tickets/${selectedTicket.id}`, {
                method: 'PATCH',
                body: JSON.stringify(editForm),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to update ticket');
            toast.success('Ticket updated successfully');
            setIsEditMode(false);
            const updated = { ...selectedTicket, ...editForm };
            setSelectedTicket(updated);
            fetchTickets();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update ticket');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleDeleteTicket = async (ticket: Ticket) => {
        setDeleting(true);
        try {
            const response = await adminFetch(`/api/admin/tickets/${ticket.id}`, { method: 'DELETE' });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Failed to delete ticket');
            toast.success('Ticket deleted');
            setIsDeleteConfirmOpen(false);
            setDeleteTarget(null);
            if (selectedTicket?.id === ticket.id) {
                setIsDialogOpen(false);
                setSelectedTicket(null);
            }
            fetchTickets();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete ticket');
        } finally {
            setDeleting(false);
        }
    };

    const handleSendReply = async () => {
        if (!selectedTicket || !replySubject.trim() || !replyMessage.trim()) {
            toast.error('Please fill in both subject and message');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(selectedTicket.email)) {
            toast.error('Invalid customer email address');
            return;
        }
        setSendingReply(true);
        try {
            const response = await adminFetch('/api/admin/send-reply', {
                method: 'POST',
                body: JSON.stringify({
                    ticketId: selectedTicket.id,
                    to: selectedTicket.email,
                    subject: replySubject,
                    message: replyMessage,
                    customerName: selectedTicket.name,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Failed to send reply (${response.status})`);
            toast.success('Reply sent successfully!');
            setReplySubject('');
            setReplyMessage('');
            setShowReplyForm(false);
            fetchTickets();
        } catch (error: any) {
            toast.error(error.message || 'Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    };

    const openTicketDialog = (ticket: Ticket) => {
        setSelectedTicket(ticket);
        setEditingNotes(ticket.notes || '');
        setIsEditMode(false);
        setShowReplyForm(false);
        setIsDialogOpen(true);
    };

    const getPriorityColor = (priority?: string) => {
        switch (priority) {
            case 'urgent': return 'bg-red-500 text-white';
            case 'high': return 'bg-orange-500 text-white';
            case 'normal': return 'bg-blue-500 text-white';
            case 'low': return 'bg-gray-500 text-white';
            default: return 'bg-gray-300 text-gray-700';
        }
    };

    const getPriorityIcon = (priority?: string) => {
        switch (priority) {
            case 'urgent': return <AlertTriangle className="h-3 w-3" />;
            case 'high': return <Flag className="h-3 w-3" />;
            default: return null;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Support Tickets</h1>
                <Button onClick={fetchTickets} variant="outline" size="sm">
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            {/* Search and Filter Bar */}
            <div className="flex flex-col gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800 sm:flex-row">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                        type="text"
                        placeholder="Search by name, email, phone, service, or message..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <div className="flex items-center gap-2 sm:w-48">
                    <Filter className="h-4 w-4 text-gray-400" />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 sm:w-48">
                    <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-full">
                            <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Priority</SelectItem>
                            <SelectItem value="urgent">Urgent</SelectItem>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {(searchQuery || statusFilter !== 'all' || priorityFilter !== 'all') && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                    Showing {tickets.length} of {allTickets.length} tickets
                </div>
            )}

            <div className="rounded-xl border bg-white shadow-sm dark:bg-gray-800">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Contact</TableHead>
                            <TableHead>Service</TableHead>
                            <TableHead>Priority</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8">
                                    <div className="flex justify-center">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : tickets.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                                    No tickets found
                                </TableCell>
                            </TableRow>
                        ) : (
                            tickets.map((ticket) => (
                                <TableRow key={ticket.id}>
                                    <TableCell className="whitespace-nowrap font-medium">
                                        {format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
                                    </TableCell>
                                    <TableCell>{ticket.name}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-sm">
                                            <span>{ticket.email}</span>
                                            <span className="text-gray-500">{ticket.phone}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>{ticket.service || 'N/A'}</TableCell>
                                    <TableCell>
                                        <Badge className={getPriorityColor(ticket.priority)}>
                                            <span className="flex items-center gap-1">
                                                {getPriorityIcon(ticket.priority)}
                                                {ticket.priority || 'normal'}
                                            </span>
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant={ticket.status === 'open' ? 'destructive' : ticket.status === 'closed' ? 'secondary' : 'default'}>
                                            {ticket.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openTicketDialog(ticket)}
                                                className="h-8"
                                                title="View ticket"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    openTicketDialog(ticket);
                                                    setTimeout(() => {
                                                        setEditForm({ name: ticket.name, email: ticket.email, phone: ticket.phone, service: ticket.service || '', message: ticket.message });
                                                        setIsEditMode(true);
                                                    }, 50);
                                                }}
                                                className="h-8 border-blue-300 text-blue-600 hover:bg-blue-50 hover:text-blue-700"
                                                title="Edit ticket"
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setDeleteTarget(ticket);
                                                    setIsDeleteConfirmOpen(true);
                                                }}
                                                className="h-8 border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                                                title="Delete ticket"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                            <select
                                                className="rounded border bg-transparent p-1 text-sm text-gray-700 dark:text-gray-300"
                                                value={ticket.status}
                                                onChange={(e) => updateStatus(ticket.id, e.target.value)}
                                            >
                                                <option value="open">Open</option>
                                                <option value="pending">Pending</option>
                                                <option value="closed">Closed</option>
                                            </select>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-red-600">
                            <Trash2 className="h-5 w-5" />
                            Delete Ticket
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-gray-700 dark:text-gray-300">
                            Are you sure you want to delete the ticket from <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => { setIsDeleteConfirmOpen(false); setDeleteTarget(null); }}
                                disabled={deleting}
                            >
                                Cancel
                            </Button>
                            <Button
                                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                                onClick={() => deleteTarget && handleDeleteTicket(deleteTarget)}
                                disabled={deleting}
                            >
                                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Ticket Details Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) { setIsEditMode(false); setShowReplyForm(false); } }}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="text-2xl">Ticket Details</DialogTitle>
                            {selectedTicket && !isEditMode && (
                                <div className="flex gap-2 mr-6">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-blue-300 text-blue-600 hover:bg-blue-50"
                                        onClick={() => {
                                            setEditForm({ name: selectedTicket.name, email: selectedTicket.email, phone: selectedTicket.phone, service: selectedTicket.service || '', message: selectedTicket.message });
                                            setIsEditMode(true);
                                        }}
                                    >
                                        <Pencil className="mr-1 h-4 w-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="border-red-300 text-red-600 hover:bg-red-50"
                                        onClick={() => { setDeleteTarget(selectedTicket); setIsDeleteConfirmOpen(true); }}
                                    >
                                        <Trash2 className="mr-1 h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            )}
                        </div>
                    </DialogHeader>

                    {selectedTicket && (
                        <div className="space-y-6 mt-4">
                            {/* Status and Priority Controls */}
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <Badge
                                        variant={selectedTicket.status === 'open' ? 'destructive' : selectedTicket.status === 'closed' ? 'secondary' : 'default'}
                                        className="text-lg px-4 py-2"
                                    >
                                        {selectedTicket.status.toUpperCase()}
                                    </Badge>
                                    <Badge className={`${getPriorityColor(selectedTicket.priority)} text-lg px-4 py-2`}>
                                        <span className="flex items-center gap-1">
                                            {getPriorityIcon(selectedTicket.priority)}
                                            {(selectedTicket.priority || 'normal').toUpperCase()}
                                        </span>
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        value={selectedTicket.status}
                                        onChange={(e) => { updateStatus(selectedTicket.id, e.target.value); setSelectedTicket({ ...selectedTicket, status: e.target.value as any }); }}
                                    >
                                        <option value="open">Open</option>
                                        <option value="pending">Pending</option>
                                        <option value="closed">Closed</option>
                                    </select>
                                    <select
                                        className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 focus:border-brand-gold focus:outline-none focus:ring-1 focus:ring-brand-gold dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                        value={selectedTicket.priority || 'normal'}
                                        onChange={(e) => { updatePriority(selectedTicket.id, e.target.value); setSelectedTicket({ ...selectedTicket, priority: e.target.value as any }); }}
                                    >
                                        <option value="low">Low</option>
                                        <option value="normal">Normal</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                            </div>

                            {/* Customer Information — View or Edit mode */}
                            <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-700 dark:bg-gray-800">
                                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
                                    <FileText className="h-5 w-5 text-brand-gold" />
                                    Customer Information
                                    {isEditMode && <span className="ml-auto text-sm font-normal text-blue-600">(Editing)</span>}
                                </h3>

                                {isEditMode ? (
                                    <div className="space-y-4">
                                        <div className="grid gap-4 md:grid-cols-2">
                                            <div>
                                                <Label htmlFor="edit-name">Name *</Label>
                                                <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="edit-email">Email *</Label>
                                                <Input id="edit-email" type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="edit-phone">Phone *</Label>
                                                <Input id="edit-phone" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="edit-service">Service</Label>
                                                <Input id="edit-service" value={editForm.service} onChange={(e) => setEditForm({ ...editForm, service: e.target.value })} className="mt-1" />
                                            </div>
                                        </div>
                                        <div>
                                            <Label htmlFor="edit-message">Message</Label>
                                            <Textarea id="edit-message" value={editForm.message} onChange={(e) => setEditForm({ ...editForm, message: e.target.value })} className="mt-1 min-h-[100px] resize-none" />
                                        </div>
                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                onClick={handleEditTicket}
                                                disabled={savingEdit}
                                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                            >
                                                {savingEdit ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                                Save Changes
                                            </Button>
                                            <Button
                                                variant="outline"
                                                onClick={() => setIsEditMode(false)}
                                                disabled={savingEdit}
                                            >
                                                <X className="mr-2 h-4 w-4" />
                                                Cancel
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="flex items-start gap-3">
                                            <FileText className="mt-1 h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">{selectedTicket.name}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Mail className="mt-1 h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                                                <a href={`mailto:${selectedTicket.email}`} className="text-base font-semibold text-brand-navy hover:underline dark:text-brand-gold">
                                                    {selectedTicket.email}
                                                </a>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Phone className="mt-1 h-5 w-5 text-gray-400" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                                                <div className="flex items-center gap-2">
                                                    <a href={`tel:${selectedTicket.phone}`} className="text-base font-semibold text-brand-navy hover:underline dark:text-brand-gold">
                                                        {selectedTicket.phone}
                                                    </a>
                                                    <a
                                                        href={`https://wa.me/${selectedTicket.phone.replace(/[^0-9]/g, '')}?text=Hi ${encodeURIComponent(selectedTicket.name)}, regarding your inquiry about ${encodeURIComponent(selectedTicket.service || 'your request')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="inline-flex items-center gap-1 rounded-full bg-brand-green px-3 py-1 text-xs font-medium text-white hover:bg-brand-green/90"
                                                    >
                                                        <MessageCircle className="h-3 w-3" />
                                                        WhatsApp
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-3">
                                            <Calendar className="mt-1 h-5 w-5 text-gray-400" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Date</p>
                                                <p className="text-base font-semibold text-gray-900 dark:text-white">
                                                    {format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Service & Message (view mode only) */}
                            {!isEditMode && (
                                <>
                                    {selectedTicket.service && (
                                        <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                                            <h3 className="mb-2 text-sm font-medium text-gray-500 dark:text-gray-400">Service</h3>
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTicket.service}</p>
                                        </div>
                                    )}
                                    <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                                        <h3 className="mb-3 text-sm font-medium text-gray-500 dark:text-gray-400">Message</h3>
                                        <p className="whitespace-pre-wrap text-base text-gray-900 dark:text-white">{selectedTicket.message}</p>
                                    </div>
                                </>
                            )}

                            {/* Quick Actions */}
                            {!isEditMode && (
                                <div className="flex flex-wrap gap-3">
                                    <a
                                        href={`https://wa.me/${selectedTicket.phone.replace(/[^0-9]/g, '')}?text=Hi ${encodeURIComponent(selectedTicket.name)}, regarding your inquiry about ${encodeURIComponent(selectedTicket.service || 'your request')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 rounded-lg bg-brand-green px-4 py-2 text-sm font-medium text-white hover:bg-brand-green/90"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Reply on WhatsApp
                                    </a>
                                    <a
                                        href={`mailto:${selectedTicket.email}?subject=Re: ${encodeURIComponent(selectedTicket.service || 'Your Inquiry')}`}
                                        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                                    >
                                        <Mail className="h-4 w-4" />
                                        Reply via Email
                                    </a>
                                </div>
                            )}

                            {/* Reply Form */}
                            {!isEditMode && (
                                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="mb-4 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Mail className="h-5 w-5 text-brand-gold" />
                                            <Label className="text-base font-semibold text-gray-900 dark:text-white">Send Email Reply</Label>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setShowReplyForm(!showReplyForm);
                                                if (!showReplyForm) setReplySubject(`Re: Inquiry about ${selectedTicket.service || 'your request'}`);
                                            }}
                                        >
                                            {showReplyForm ? 'Cancel' : 'Send Email'}
                                        </Button>
                                    </div>
                                    {showReplyForm && (
                                        <div className="space-y-4 mt-4">
                                            <div>
                                                <Label htmlFor="reply-subject">Subject *</Label>
                                                <Input id="reply-subject" value={replySubject} onChange={(e) => setReplySubject(e.target.value)} placeholder="Email subject" className="mt-1" />
                                            </div>
                                            <div>
                                                <Label htmlFor="reply-message">Message *</Label>
                                                <Textarea id="reply-message" value={replyMessage} onChange={(e) => setReplyMessage(e.target.value)} placeholder="Type your reply message here..." className="mt-1 min-h-[150px] resize-none" />
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    onClick={handleSendReply}
                                                    disabled={sendingReply || !replySubject.trim() || !replyMessage.trim()}
                                                    className="bg-brand-gold hover:bg-brand-gold/90"
                                                >
                                                    {sendingReply ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Sending...</> : <><Send className="mr-2 h-4 w-4" />Send Reply</>}
                                                </Button>
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    Sending to: <strong>{selectedTicket.email}</strong>
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Notes */}
                            {!isEditMode && (
                                <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
                                    <div className="mb-3 flex items-center gap-2">
                                        <StickyNote className="h-5 w-5 text-brand-gold" />
                                        <Label className="text-base font-semibold text-gray-900 dark:text-white">Internal Notes</Label>
                                    </div>
                                    <Textarea
                                        placeholder="Add notes about this ticket..."
                                        value={editingNotes !== '' ? editingNotes : (selectedTicket.notes || '')}
                                        onChange={(e) => setEditingNotes(e.target.value)}
                                        onBlur={() => { if (editingNotes !== (selectedTicket.notes || '')) updateNotes(selectedTicket.id, editingNotes); }}
                                        className="min-h-[100px] resize-none"
                                    />
                                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">Auto-saved when you click outside</p>
                                </div>
                            )}

                            {/* Additional Info */}
                            {!isEditMode && (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {selectedTicket.estimated_value && (
                                        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                            <DollarSign className="mt-1 h-5 w-5 text-brand-gold" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Estimated Value</p>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">AED {selectedTicket.estimated_value.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedTicket.follow_up_date && (
                                        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                            <Calendar className="mt-1 h-5 w-5 text-brand-gold" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Follow-up Date</p>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {format(new Date(selectedTicket.follow_up_date), 'MMM d, yyyy HH:mm')}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                    {selectedTicket.lead_score !== undefined && selectedTicket.lead_score > 0 && (
                                        <div className="flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                            <Flag className="mt-1 h-5 w-5 text-brand-gold" />
                                            <div>
                                                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Lead Score</p>
                                                <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedTicket.lead_score}/100</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!isEditMode && (
                                <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                        Source: <span className="font-medium text-gray-900 dark:text-white">{selectedTicket.source}</span>
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
