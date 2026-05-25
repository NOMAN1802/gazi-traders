/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useReactToPrint } from 'react-to-print';
import {
    MagnifyingGlassIcon,
    PencilSquareIcon,
    TrashIcon,
    PrinterIcon,
    ArrowDownTrayIcon,
    XMarkIcon,
    BanknotesIcon,
    CheckCircleIcon,
    FunnelIcon,
} from '@heroicons/react/24/outline';
import {
    useGetDueBillsQuery,
    useUpdateDueBillMutation,
    usePayDueBillMutation,
    useDeleteDueBillMutation,
    type DueBill,
} from '@/services/dueBillsApi';
import { useGetCustomersQuery } from '@/services/customersApi';
import Loader from '@/components/common/Loader';
import DateRangeSelector from '@/pages/reports/DateRangeSelector';
import gaziLogo from '@/assets/gaziLogo.svg';

type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const statusColors: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    partial: 'bg-blue-100 text-blue-800',
    paid: 'bg-emerald-100 text-emerald-800',
};

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Cash' },
    { value: 'bank_transfer', label: 'Bank Transfer' },
    { value: 'mobile_banking', label: 'Mobile Banking' },
    { value: 'cheque', label: 'Cheque' },
    { value: 'other', label: 'Other' },
];

import { usePermissions } from '@/hooks/usePermissions';

const PAGE_SIZE = 10;

const DueBillsPage = () => {
    const { canEditDelete } = usePermissions();
    const invoicePrintRef = useRef<HTMLDivElement>(null);

    const [dateRange, setDateRange] = useState<DateRangeType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [search, setSearch] = useState('');
    const [customerFilter, setCustomerFilter] = useState('');
    const [page, setPage] = useState(1);

    const [editBill, setEditBill] = useState<DueBill | null>(null);
    const [payBill, setPayBill] = useState<DueBill | null>(null);
    const [invoiceBill, setInvoiceBill] = useState<DueBill | null>(null);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const [payAmount, setPayAmount] = useState('');
    const [payMethod, setPayMethod] = useState('cash');
    const [payNotes, setPayNotes] = useState('');
    const [payError, setPayError] = useState('');

    const [editCustomerId, setEditCustomerId] = useState('');
    const [editCustomerName, setEditCustomerName] = useState('');
    const [editCustomerPhone, setEditCustomerPhone] = useState('');
    const [editPartyName, setEditPartyName] = useState('');
    const [editAmount, setEditAmount] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [editError, setEditError] = useState('');

    const [updateDueBill, { isLoading: updating }] = useUpdateDueBillMutation();
    const [payDueBill, { isLoading: paying }] = usePayDueBillMutation();
    const [deleteDueBill] = useDeleteDueBillMutation();
    const { data: customersData } = useGetCustomersQuery({ limit: 1000 });
    const customers = customersData?.customers ?? [];

    const getDateRangeParams = useMemo(() => {
        if (dateRange === 'all') return undefined;
        const now = dayjs();
        let startDate: string, endDate: string;
        if (dateRange === 'custom' && customStartDate && customEndDate) {
            startDate = dayjs(customStartDate).startOf('day').toISOString();
            endDate = dayjs(customEndDate).endOf('day').toISOString();
        } else {
            switch (dateRange) {
                case 'daily': startDate = now.startOf('day').toISOString(); endDate = now.endOf('day').toISOString(); break;
                case 'weekly': startDate = now.startOf('week').toISOString(); endDate = now.endOf('week').toISOString(); break;
                case 'monthly': startDate = now.startOf('month').toISOString(); endDate = now.endOf('month').toISOString(); break;
                case 'yearly': startDate = now.startOf('year').toISOString(); endDate = now.endOf('year').toISOString(); break;
                default: startDate = now.startOf('day').toISOString(); endDate = now.endOf('day').toISOString();
            }
        }
        return { startDate, endDate };
    }, [dateRange, customStartDate, customEndDate]);

    const { data: allData, isLoading, isFetching } = useGetDueBillsQuery({
        limit: 10000,
        ...(getDateRangeParams ?? {}),
    });

    const allBills = useMemo(() => allData?.dueBills ?? [], [allData?.dueBills]);

    const filteredBills = useMemo(() => {
        let result = allBills;
        if (customerFilter) {
            result = result.filter((b) => {
                const cid = typeof b.customerId === 'object' ? (b.customerId as any)?._id : b.customerId;
                return cid === customerFilter;
            });
        }
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            result = result.filter((b) =>
                b.customer.name.toLowerCase().includes(q) ||
                b.partyName.toLowerCase().includes(q) ||
                b.dueBillNumber.toLowerCase().includes(q)
            );
        }
        return result;
    }, [allBills, customerFilter, search]);

    const total = filteredBills.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const dueBills = filteredBills.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const stats = useMemo(() => ({
        total: allBills.length,
        totalAmount: allBills.reduce((s, b) => s + b.amount, 0),
        totalPaid: allBills.reduce((s, b) => s + b.paidAmount, 0),
        totalDue: allBills.reduce((s, b) => s + (b.amount - b.paidAmount), 0),
    }), [allBills]);

    const openEdit = (bill: DueBill) => {
        setEditBill(bill);
        setEditCustomerId(typeof bill.customerId === 'object' ? (bill.customerId as any)?._id ?? '' : bill.customerId ?? '');
        setEditCustomerName(bill.customer.name);
        setEditCustomerPhone(bill.customer.phone ?? '');
        setEditPartyName(bill.partyName);
        setEditAmount(String(bill.amount));
        setEditNotes(bill.notes ?? '');
        setEditError('');
    };

    const handleEditCustomer = (id: string) => {
        setEditCustomerId(id);
        const c = customers.find((c: any) => c._id === id);
        if (c) { setEditCustomerName((c as any).name ?? ''); setEditCustomerPhone((c as any).phone ?? ''); }
    };

    const handleEditSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditError('');
        if (!editCustomerName.trim()) return setEditError('Customer name required');
        if (!editPartyName.trim()) return setEditError('Party name required');
        if (!editAmount || Number(editAmount) <= 0) return setEditError('Amount must be > 0');
        try {
            await updateDueBill({
                id: editBill!._id,
                data: {
                    customerId: editCustomerId || undefined,
                    customer: { name: editCustomerName.trim(), phone: editCustomerPhone.trim() || undefined },
                    partyName: editPartyName.trim(),
                    amount: Number(editAmount),
                    notes: editNotes.trim() || undefined,
                },
            }).unwrap();
            setEditBill(null);
        } catch (err: any) {
            setEditError(err?.data?.message ?? 'Update failed');
        }
    };

    const openPay = (bill: DueBill, fullPay = false) => {
        setPayBill(bill);
        setPayAmount(fullPay ? String(bill.amount - bill.paidAmount) : '');
        setPayMethod('cash');
        setPayNotes('');
        setPayError('');
    };

    const handlePaySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setPayError('');
        const amt = Number(payAmount);
        const remaining = payBill!.amount - payBill!.paidAmount;
        if (!amt || amt <= 0) return setPayError('Enter a valid amount');
        if (amt > remaining) return setPayError(`Cannot exceed remaining ৳${remaining.toLocaleString()}`);
        try {
            await payDueBill({ id: payBill!._id, amount: amt, paymentMethod: payMethod, notes: payNotes.trim() || undefined }).unwrap();
            setPayBill(null);
        } catch (err: any) {
            setPayError(err?.data?.message ?? 'Payment failed');
        }
    };

    const handleDelete = async (id: string) => {
        await deleteDueBill(id).unwrap().catch(() => null);
        setDeleteConfirm(null);
    };

    const handleInvoicePrint = useReactToPrint({
        contentRef: invoicePrintRef,
        documentTitle: `DueBill_${invoiceBill?.dueBillNumber ?? 'Invoice'}`,
    });

    const handleExport = () => {
        const rows = allBills.map((b, i) => ({
            'S/N': i + 1, 'Bill No': b.dueBillNumber,
            'Date': dayjs(b.createdAt).format('DD/MM/YYYY'),
            'Customer': b.customer.name, 'Party Name': b.partyName,
            'Amount (৳)': b.amount, 'Paid (৳)': b.paidAmount,
            'Due (৳)': b.amount - b.paidAmount, 'Status': b.status,
        }));
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Due Bills');
        XLSX.writeFile(wb, `Due_Bills_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    };

    const inputCls = 'w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20';
    const labelCls = 'block text-xs font-medium text-slate-700 mb-1';

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        if (totalPages <= 10) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
        else if (page <= 6) { for (let i = 1; i <= 10; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
        else if (page >= totalPages - 5) { pages.push(1); pages.push('...'); for (let i = totalPages - 9; i <= totalPages; i++) pages.push(i); }
        else { pages.push(1); pages.push('...'); for (let i = page - 2; i <= page + 2; i++) pages.push(i); pages.push('...'); pages.push(totalPages); }
        return pages;
    };

    return (
        <>
            {/* Hidden print ref for invoice */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
                <div ref={invoicePrintRef}>
                    {invoiceBill && <InvoicePrint bill={invoiceBill} statusColors={statusColors} />}
                </div>
            </div>

            <div className="space-y-8">
                {/* Header */}
                <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Finance Management</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">Due Bills</h1>
                        <p className="text-sm text-slate-500">Track pending, partial, and paid due bills.</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                                placeholder="Search customer or party..."
                                className="w-64 rounded-sm border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                            />
                        </div>
                        <div className="relative flex items-center gap-1.5">
                            <FunnelIcon className={`h-4 w-4 ${customerFilter ? 'text-brand' : 'text-slate-400'}`} />
                            <select
                                value={customerFilter}
                                onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}
                                className={`rounded-sm border py-2 pl-3 pr-8 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors ${customerFilter ? 'border-brand bg-brand/5 text-brand' : 'border-slate-200 bg-white text-slate-600'}`}
                            >
                                <option value="">All Customers</option>
                                {customers.map((c: any) => (
                                    <option key={c._id} value={c._id}>{c.name}{c.address ? ` - ${c.address}` : ''}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </header>

                {/* Date Range Selector */}
                <DateRangeSelector
                    dateRange={dateRange}
                    customStartDate={customStartDate}
                    customEndDate={customEndDate}
                    onDateRangeChange={(range) => { setDateRange(range); if (range !== 'custom') { setCustomStartDate(''); setCustomEndDate(''); } setPage(1); }}
                    onCustomStartDateChange={setCustomStartDate}
                    onCustomEndDateChange={setCustomEndDate}
                    onApplyCustomRange={() => { if (customStartDate && customEndDate) { setDateRange('custom'); setPage(1); } }}
                />

                {/* Stats Cards */}
                <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                    {[
                        { label: 'Total Bills', value: stats.total, color: 'blue', icon: '📋' },
                        { label: 'Total Amount', value: `৳${stats.totalAmount.toLocaleString()}`, color: 'purple', icon: '💰' },
                        { label: 'Total Paid', value: `৳${stats.totalPaid.toLocaleString()}`, color: 'emerald', icon: '✅' },
                        { label: 'Total Due', value: `৳${stats.totalDue.toLocaleString()}`, color: 'amber', icon: '⏳' },
                    ].map((card) => (
                        <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{card.icon}</span>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                    </div>
                                    <p className={`text-2xl font-bold group-hover:scale-105 transition-transform duration-300 ${card.color === 'emerald' ? 'text-emerald-600' : card.color === 'amber' ? 'text-amber-600' : card.color === 'purple' ? 'text-purple-600' : 'text-blue-600'}`}>
                                        {card.value}
                                    </p>
                                </div>
                                <div className={`rounded-sm p-2 opacity-60 group-hover:opacity-100 transition-opacity duration-300 ${card.color === 'emerald' ? 'bg-emerald-100' : card.color === 'amber' ? 'bg-amber-100' : card.color === 'purple' ? 'bg-purple-100' : 'bg-blue-100'}`}>
                                    <div className={`h-2 w-2 rounded-sm ${card.color === 'emerald' ? 'bg-emerald-500' : card.color === 'amber' ? 'bg-amber-500' : card.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'}`} />
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Table Section */}
                <div className="rounded-sm border border-white/70 bg-white/90 shadow-card overflow-hidden">
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">All Due Bills</h2>
                        <button onClick={handleExport} className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors">
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            Export
                        </button>
                    </div>

                    {isLoading || isFetching ? (
                        <div className="py-16 flex justify-center"><Loader message="Loading due bills..." /></div>
                    ) : dueBills.length === 0 ? (
                        <div className="py-16 text-center">
                            <p className="text-slate-500 text-sm font-semibold">No due bills found.</p>
                            <p className="text-slate-400 text-xs mt-1">Try adjusting your filters or add a new due bill.</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-slate-100 text-xs">
                                    <thead className="bg-slate-50">
                                        <tr>
                                            {['S/N', 'Bill No', 'Date', 'Customer', 'Party Name', 'Amount', 'Paid', 'Due', 'Status', 'Actions'].map(h => (
                                                <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 whitespace-nowrap">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {dueBills.map((bill, idx) => {
                                            const due = bill.amount - bill.paidAmount;
                                            return (
                                                <tr key={bill._id} className="hover:bg-slate-50/60 transition-colors">
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{(page - 1) * PAGE_SIZE + idx + 1}</td>
                                                    <td className="px-4 py-3 font-semibold text-brand text-xs whitespace-nowrap">{bill.dueBillNumber}</td>
                                                    <td className="px-4 py-3 text-slate-500 text-xs whitespace-nowrap">{dayjs(bill.createdAt).format('DD MMM YYYY')}</td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <div className="font-medium text-slate-800">{bill.customer.name}</div>
                                                        {(bill.customer as any).address && <div className="text-[10px] text-slate-400 mt-0.5">{(bill.customer as any).address}</div>}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs">
                                                        <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Party: </span>
                                                        <span className="text-slate-700">{bill.partyName}</span>
                                                    </td>
                                                    <td className="px-4 py-3 font-semibold text-slate-900 text-xs whitespace-nowrap">৳{bill.amount.toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                                                        <span className="font-medium text-emerald-600">৳{bill.paidAmount.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-xs font-semibold whitespace-nowrap">
                                                        <span className={due > 0 ? 'text-red-600' : 'text-emerald-600'}>৳{due.toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-[10px] font-semibold capitalize ${statusColors[bill.status]}`}>
                                                            {bill.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-1">
                                                            <button onClick={() => setInvoiceBill(bill)} title="Invoice" className="rounded-sm p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors">
                                                                <PrinterIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                            {bill.status !== 'paid' && <>
                                                                <button onClick={() => openEdit(bill)} disabled={!canEditDelete} title={canEditDelete ? 'Edit' : 'No permission'} className="rounded-sm p-1.5 text-slate-400 hover:bg-slate-100 hover:text-brand transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400">
                                                                    <PencilSquareIcon className="h-3.5 w-3.5" />
                                                                </button>
                                                                <button onClick={() => openPay(bill, false)} title="Pay Partially" className="rounded-sm px-2 py-1 text-[10px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors whitespace-nowrap">
                                                                    <BanknotesIcon className="h-3 w-3 inline mr-0.5" />Part
                                                                </button>
                                                                <button onClick={() => openPay(bill, true)} title="Pay Fully" className="rounded-sm px-2 py-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors whitespace-nowrap">
                                                                    <CheckCircleIcon className="h-3 w-3 inline mr-0.5" />Full
                                                                </button>
                                                            </>}
                                                            <button onClick={() => setDeleteConfirm(bill._id)} disabled={!canEditDelete} title={canEditDelete ? 'Delete' : 'No permission'} className="rounded-sm p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-slate-400">
                                                                <TrashIcon className="h-3.5 w-3.5" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                                    <p className="text-xs text-slate-500">
                                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total} bills
                                    </p>
                                    <div className="flex gap-1">
                                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="rounded-sm border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors">Prev</button>
                                        {getPageNumbers().map((p, i) =>
                                            p === '...' ? <span key={`e${i}`} className="px-2 py-1.5 text-xs text-slate-400">...</span> :
                                                <button key={p} onClick={() => setPage(Number(p))} className={`rounded-sm border px-3 py-1.5 text-xs font-medium transition-colors ${Number(p) === page ? 'border-brand bg-brand text-white' : 'border-slate-200 hover:bg-slate-50'}`}>{p}</button>
                                        )}
                                        <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="rounded-sm border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors">Next</button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Edit Modal */}
            {editBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-sm bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-4">
                            <h3 className="text-sm font-bold text-slate-900">Edit Due Bill — {editBill.dueBillNumber}</h3>
                            <button onClick={() => setEditBill(null)} className="rounded-sm p-1.5 text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-4 w-4" /></button>
                        </div>
                        <form onSubmit={handleEditSubmit} className="p-4 space-y-3">
                            {editError && <div className="rounded-sm bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{editError}</div>}
                            <div>
                                <label className={labelCls}>Select Customer</label>
                                <select value={editCustomerId} onChange={e => handleEditCustomer(e.target.value)} className={inputCls}>
                                    <option value="">-- Select customer --</option>
                                    {customers.map((c: any) => <option key={c._id} value={c._id}>{c.name}{c.phone ? ` (${c.phone})` : ''}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Customer Name *</label><input type="text" value={editCustomerName} onChange={e => setEditCustomerName(e.target.value)} className={inputCls} required /></div>
                                <div><label className={labelCls}>Phone</label><input type="text" value={editCustomerPhone} onChange={e => setEditCustomerPhone(e.target.value)} className={inputCls} /></div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div><label className={labelCls}>Party Name *</label><input type="text" value={editPartyName} onChange={e => setEditPartyName(e.target.value)} className={inputCls} required /></div>
                                <div><label className={labelCls}>Amount (৳) *</label><input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} min="0.01" step="0.01" className={inputCls} required /></div>
                            </div>
                            <div><label className={labelCls}>Notes</label><textarea value={editNotes} onChange={e => setEditNotes(e.target.value)} rows={2} className={inputCls} /></div>
                            <div className="flex gap-2 pt-1">
                                <button type="submit" disabled={updating} className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-brand/90 disabled:opacity-60">{updating ? 'Saving...' : 'Save Changes'}</button>
                                <button type="button" onClick={() => setEditBill(null)} className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Pay Modal */}
            {payBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-md rounded-sm bg-white shadow-2xl">
                        <div className="flex items-center justify-between border-b border-slate-100 p-4">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">Record Payment</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{payBill.dueBillNumber} — {payBill.customer.name}</p>
                            </div>
                            <button onClick={() => setPayBill(null)} className="rounded-sm p-1.5 text-slate-400 hover:bg-slate-100"><XMarkIcon className="h-4 w-4" /></button>
                        </div>
                        <form onSubmit={handlePaySubmit} className="p-4 space-y-3">
                            <div className="rounded-sm bg-slate-50 p-3 text-xs space-y-1.5">
                                <div className="flex justify-between"><span className="text-slate-500">Total Due</span><span className="font-semibold">৳{payBill.amount.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Already Paid</span><span className="font-semibold text-emerald-600">৳{payBill.paidAmount.toLocaleString()}</span></div>
                                <div className="flex justify-between border-t border-slate-200 pt-1.5"><span className="font-semibold text-slate-700">Remaining</span><span className="font-bold text-red-600">৳{(payBill.amount - payBill.paidAmount).toLocaleString()}</span></div>
                            </div>
                            {payError && <div className="rounded-sm bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{payError}</div>}
                            <div>
                                <label className={labelCls}>Payment Amount (৳) *</label>
                                <input type="number" value={payAmount} onChange={e => setPayAmount(e.target.value)} min="0.01" max={payBill.amount - payBill.paidAmount} step="0.01" placeholder="Enter amount" className={inputCls} required autoFocus />
                            </div>
                            <div>
                                <label className={labelCls}>Payment Method</label>
                                <select value={payMethod} onChange={e => setPayMethod(e.target.value)} className={inputCls}>
                                    {PAYMENT_METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                                </select>
                            </div>
                            <div><label className={labelCls}>Notes</label><input type="text" value={payNotes} onChange={e => setPayNotes(e.target.value)} placeholder="Optional note" className={inputCls} /></div>
                            <div className="flex gap-2 pt-1">
                                <button type="submit" disabled={paying} className="rounded-sm bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60">{paying ? 'Processing...' : 'Confirm Payment'}</button>
                                <button type="button" onClick={() => setPayBill(null)} className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                            </div>
                            {payBill.payments.length > 0 && (
                                <div className="border-t border-slate-100 pt-3 mt-2">
                                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 mb-2">Payment History</p>
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {payBill.payments.map((p, i) => (
                                            <div key={i} className="flex justify-between text-[10px] text-slate-600">
                                                <span>{dayjs(p.date).format('DD MMM YY')} · {p.paymentMethod.replace('_', ' ')}</span>
                                                <span className="font-semibold text-emerald-600">৳{p.amount.toLocaleString()}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirm */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-sm rounded-sm bg-white shadow-2xl p-6 text-center">
                        <p className="text-sm font-bold text-slate-900 mb-1">Delete Due Bill?</p>
                        <p className="text-xs text-slate-500 mb-5">This action cannot be undone.</p>
                        <div className="flex gap-2 justify-center">
                            <button onClick={() => handleDelete(deleteConfirm)} className="rounded-sm bg-red-600 px-5 py-2 text-xs font-semibold text-white hover:bg-red-700">Delete</button>
                            <button onClick={() => setDeleteConfirm(null)} className="rounded-sm border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">Cancel</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Invoice Modal */}
            {invoiceBill && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-2xl rounded-sm bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 bg-slate-50">
                            <h3 className="text-sm font-bold text-slate-900">Due Bill Invoice <span className="text-xs font-normal text-slate-400 ml-1">#{invoiceBill.dueBillNumber}</span></h3>
                            <div className="flex gap-2">
                                <button onClick={() => handleInvoicePrint()} className="inline-flex items-center gap-1.5 rounded-sm bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/20 transition-colors">
                                    <PrinterIcon className="h-4 w-4" /> Print Invoice
                                </button>
                                <button onClick={() => setInvoiceBill(null)} className="rounded-sm p-2 text-slate-400 hover:bg-slate-200 transition-colors"><XMarkIcon className="h-5 w-5" /></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6 bg-slate-100">
                            <InvoicePrint bill={invoiceBill} statusColors={statusColors} />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

// ── Separate invoice print component ─────────────────────────────────────────
const InvoicePrint = ({ bill, statusColors }: { bill: DueBill; statusColors: Record<string, string> }) => (
    <div className="bg-white p-6 rounded-sm shadow-sm text-[10px]">
        <div className="border-b-2 border-slate-900 pb-3 mb-4">
            <div className="flex justify-between items-start">
                <div>
                    <img src={gaziLogo} alt="Gazi Traders" className="h-10 w-auto mb-1.5" />
                    <h1 className="text-base font-bold text-slate-900">DUE BILL INVOICE</h1>
                    <p className="text-[10px] text-slate-600 mt-0.5">গাজী ট্রেডার্স</p>
                    <p className="text-[9px] text-slate-500">Inventory Management System</p>
                </div>
                <div className="text-right">
                    <p className="text-sm font-bold text-brand">{bill.dueBillNumber}</p>
                    <p className="text-[9px] text-slate-600 mt-0.5">Date: {dayjs(bill.createdAt).format('DD MMM YYYY')}</p>
                    <div className="mt-2 pt-1.5 border-t border-slate-200">
                        <p className="text-[9px] font-bold text-slate-900 uppercase mb-0.5">Bill To:</p>
                        <p className="font-semibold text-slate-800">{bill.customer.name}</p>
                        {(bill.customer as any).address && <p className="text-slate-600">{(bill.customer as any).address}</p>}
                        {bill.customer.phone && <p className="text-slate-600">Phone: {bill.customer.phone}</p>}
                        {bill.customer.email && <p className="text-slate-600">Email: {bill.customer.email}</p>}
                    </div>
                </div>
            </div>
        </div>

        <table className="w-full mb-4 border-collapse">
            <thead>
                <tr className="border-b-2 border-slate-900">
                    <th className="text-center py-1.5 px-2 text-[9px] font-bold text-slate-900 uppercase">S/N</th>
                    <th className="text-left py-1.5 px-2 text-[9px] font-bold text-slate-900 uppercase">Party</th>
                    <th className="text-right py-1.5 px-2 text-[9px] font-bold text-slate-900 uppercase">Amount</th>
                </tr>
            </thead>
            <tbody>
                <tr className="border-b border-slate-200">
                    <td className="py-1.5 px-2 text-center text-slate-600">1</td>
                    <td className="py-1.5 px-2 text-slate-800">
                        <div className="font-medium">{bill.partyName}</div>
                        {bill.notes && <div className="text-[9px] text-slate-500 mt-0.5">{bill.notes}</div>}
                    </td>
                    <td className="py-1.5 px-2 text-right font-semibold text-slate-900">৳{bill.amount.toLocaleString()}</td>
                </tr>
            </tbody>
        </table>

        <div className="flex justify-end mb-4">
            <div className="w-52 space-y-1.5">
                <div className="flex justify-between text-slate-700"><span>Total Due:</span><span className="font-semibold">৳{bill.amount.toLocaleString()}</span></div>
                <div className="flex justify-between text-emerald-600"><span>Paid Amount:</span><span className="font-semibold">৳{bill.paidAmount.toLocaleString()}</span></div>
                <div className="flex justify-between border-t-2 border-slate-900 pt-1.5 font-bold text-xs"><span>REMAINING:</span><span className="text-red-600">৳{(bill.amount - bill.paidAmount).toLocaleString()}</span></div>
                <div className="flex justify-between items-center">
                    <span className="text-slate-600">Status:</span>
                    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[9px] font-semibold capitalize ${statusColors[bill.status]}`}>{bill.status}</span>
                </div>
            </div>
        </div>

        {bill.payments.length > 0 && (
            <div className="border-t border-slate-200 pt-3 mb-4">
                <p className="text-[9px] font-bold text-slate-900 uppercase tracking-wide mb-1.5">Payment History</p>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="border-b border-slate-300">
                            <th className="text-center py-1 px-2 text-[9px] font-bold text-slate-700 uppercase">S/N</th>
                            <th className="text-left py-1 px-2 text-[9px] font-bold text-slate-700 uppercase">Date</th>
                            <th className="text-left py-1 px-2 text-[9px] font-bold text-slate-700 uppercase">Method</th>
                            <th className="text-right py-1 px-2 text-[9px] font-bold text-slate-700 uppercase">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bill.payments.map((p, i) => (
                            <tr key={i} className="border-b border-slate-100">
                                <td className="py-1 px-2 text-center text-slate-500">{i + 1}</td>
                                <td className="py-1 px-2 text-slate-700">{dayjs(p.date).format('DD MMM YYYY')}</td>
                                <td className="py-1 px-2 text-slate-700 capitalize">{p.paymentMethod.replace('_', ' ')}</td>
                                <td className="py-1 px-2 text-right font-semibold text-emerald-600">৳{p.amount.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        )}

        <div className="border-t border-slate-200 pt-3 text-center text-[9px] text-slate-500">
            <p>Thank you for your business!</p>
            <p className="mt-0.5">Powered by: Bytespate Limited</p>
        </div>
    </div>
);

export default DueBillsPage;
