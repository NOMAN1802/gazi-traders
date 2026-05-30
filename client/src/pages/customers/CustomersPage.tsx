import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    BuildingOffice2Icon,
    XMarkIcon,
    EyeIcon,
    MapPinIcon,
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import StatusBadge from '@/components/common/StatusBadge';
import InvoiceModal from '@/components/invoices/InvoiceModal';
import { useGetCustomersQuery, useDeleteCustomerMutation, type Customer } from '@/services/customersApi';
import { useGetOrdersQuery, type Order } from '@/services/ordersApi';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';

function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

const AVATAR_COLORS = [
    { bg: '#EBF4FB', text: '#2B6CB0' },
    { bg: '#FDF1E5', text: '#C05621' },
    { bg: '#E6E9FF', text: '#3747D1' },
    { bg: '#E6FAF4', text: '#047857' },
    { bg: '#FEF2F2', text: '#B91C1C' },
    { bg: '#F5F3FF', text: '#6D28D9' },
];
function avatarColor(name: string) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffffff;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const CustomersPage = () => {
    const { canEditDelete } = usePermissions();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [activeAddress, setActiveAddress] = useState<string>('all');
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);

    const { data, isLoading, isError, refetch } = useGetCustomersQuery({ limit: 1000 });
    const { data: ordersData, isLoading: ordersLoading } = useGetOrdersQuery({ limit: 10000 });
    const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

    const customers = useMemo(() => data?.customers ?? [], [data]);

    // Unique sorted addresses for tabs
    const uniqueAddresses = useMemo(() => {
        const seen = new Set<string>();
        const list: string[] = [];
        for (const c of customers) {
            const addr = c.address?.trim();
            if (addr && !seen.has(addr)) { seen.add(addr); list.push(addr); }
        }
        return list;
    }, [customers]);

    // Cards filtered by active address tab + search
    const visibleCards = useMemo(() => {
        let list = customers;
        if (activeAddress !== 'all') {
            list = list.filter(c => c.address?.trim() === activeAddress);
        }
        const q = search.toLowerCase().trim();
        if (q) {
            list = list.filter(c =>
                c.name.toLowerCase().includes(q) ||
                c.phone?.toLowerCase().includes(q) ||
                c.address?.toLowerCase().includes(q),
            );
        }
        return list;
    }, [customers, activeAddress, search]);

    // Orders for the selected distributor
    const selectedOrders = useMemo(() => {
        if (!selectedCustomer || !ordersData?.result) return [];
        return ordersData.result
            .filter((o: Order) => (o.customer?.name ?? '') === selectedCustomer.name)
            .sort((a: Order, b: Order) => dayjs(b.createdAt).unix() - dayjs(a.createdAt).unix());
    }, [selectedCustomer, ordersData]);

    const handleCardClick = (c: Customer) => {
        setSelectedCustomer(prev => prev?._id === c._id ? null : c);
    };

    const handleAddressTab = (addr: string) => {
        setActiveAddress(addr);
        setSelectedCustomer(null);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete distributor "${name}"?`)) return;
        try {
            await deleteCustomer(id).unwrap();
            toast.success('Distributor deleted');
            if (selectedCustomer?._id === id) setSelectedCustomer(null);
        } catch {
            toast.error('Failed to delete distributor');
        }
    };

    // Summary totals for selected customer
    const selectedStats = useMemo(() => {
        const totalBilled = selectedOrders.reduce((s, o) => s + o.totalAmount, 0);
        const totalPaid   = selectedOrders.reduce((s, o) => s + (o.paidAmount || 0), 0);
        return { totalBilled, totalPaid, balance: totalBilled - totalPaid };
    }, [selectedOrders]);

    if (isLoading) return <Loader fullScreen message="Loading distributors..." />;
    if (isError) return <ErrorState description="Unable to load distributors" onRetry={refetch} />;

    const addressCount = (addr: string) => customers.filter(c => c.address?.trim() === addr).length;
    const fmt = (n: number) => `৳${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    return (
        <div className="space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-brand">Partners</p>
                    <h1 className="mt-0.5 text-2xl font-bold text-slate-900">{customers.length} Distributors</h1>
                </div>
                <button
                    onClick={() => navigate('/customers/new')}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition"
                >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add Distributor
                </button>
            </div>

            {/* ── Address Tabs ── */}
            {uniqueAddresses.length > 0 && (
                <div className="rounded-sm border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center gap-0 overflow-x-auto border-b border-slate-100">
                        {/* All tab */}
                        <button
                            onClick={() => handleAddressTab('all')}
                            className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                activeAddress === 'all'
                                    ? 'border-brand text-brand bg-brand/5'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            <BuildingOffice2Icon className="h-3.5 w-3.5" />
                            All Areas
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeAddress === 'all' ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {customers.length}
                            </span>
                        </button>

                        {uniqueAddresses.map(addr => (
                            <button
                                key={addr}
                                onClick={() => handleAddressTab(addr)}
                                className={`flex shrink-0 items-center gap-1.5 px-4 py-3 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
                                    activeAddress === addr
                                        ? 'border-brand text-brand bg-brand/5'
                                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                            >
                                <MapPinIcon className="h-3.5 w-3.5" />
                                <span className="max-w-[160px] truncate">{addr}</span>
                                <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeAddress === addr ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                                    {addressCount(addr)}
                                </span>
                            </button>
                        ))}
                    </div>

                    {/* Search inside the tab bar row */}
                    <div className="px-4 py-3">
                        <div className="relative max-w-xs">
                            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by name, phone, or address…"
                                className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* ── Distributor Cards ── */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCards.map(c => {
                    const { bg, text } = avatarColor(c.name);
                    const isSelected = selectedCustomer?._id === c._id;
                    return (
                        <div
                            key={c._id}
                            onClick={() => handleCardClick(c)}
                            className={`rounded-sm border bg-white p-4 shadow-sm cursor-pointer transition-all duration-150 ${
                                isSelected
                                    ? 'border-brand/50 ring-2 ring-brand/25 shadow-md shadow-brand/10'
                                    : 'border-slate-200/60 hover:border-slate-300 hover:shadow-md'
                            }`}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-sm font-bold"
                                    style={{ background: bg, color: text }}
                                >
                                    {initials(c.name)}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <div className="font-semibold text-slate-900 text-sm truncate">{c.name}</div>
                                    {c.phone && (
                                        <div className="text-[11px] text-slate-500 font-mono">{c.phone}</div>
                                    )}
                                </div>
                                <span className={`shrink-0 inline-flex items-center rounded-sm px-2 py-0.5 text-[9px] font-semibold ${
                                    c.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {c.status}
                                </span>
                            </div>

                            {c.address && (
                                <div className="mt-2.5 flex items-start gap-1.5">
                                    <MapPinIcon className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                                    <span className="text-xs text-slate-600 leading-snug">{c.address}</span>
                                    {isSelected && (
                                        <span className="ml-auto shrink-0 text-[10px] font-semibold text-brand">selected</span>
                                    )}
                                </div>
                            )}

                            <div
                                className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-100"
                                onClick={e => e.stopPropagation()}
                            >
                                <button
                                    onClick={() => navigate(`/customers/${c._id}/edit`)}
                                    disabled={!canEditDelete}
                                    className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <PencilIcon className="h-3 w-3" /> Edit
                                </button>
                                <button
                                    onClick={() => handleDelete(c._id, c.name)}
                                    disabled={isDeleting || !canEditDelete}
                                    className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
                                >
                                    <TrashIcon className="h-3 w-3" /> Delete
                                </button>
                            </div>
                        </div>
                    );
                })}

                {visibleCards.length === 0 && (
                    <div className="col-span-full py-14 text-center text-sm text-slate-400">
                        {search ? 'No distributors match your search.' : 'No distributors in this area.'}
                    </div>
                )}
            </div>

            {/* ── Selected Distributor Transactions ── */}
            {selectedCustomer && (
                <div className="rounded-sm border border-brand/20 bg-white shadow-sm overflow-hidden">
                    {/* Panel header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-brand/5">
                        <div className="flex items-center gap-3">
                            {(() => {
                                const { bg, text } = avatarColor(selectedCustomer.name);
                                return (
                                    <div
                                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-sm text-sm font-bold"
                                        style={{ background: bg, color: text }}
                                    >
                                        {initials(selectedCustomer.name)}
                                    </div>
                                );
                            })()}
                            <div>
                                <h3 className="text-sm font-bold text-slate-900">{selectedCustomer.name}</h3>
                                <p className="text-[10px] text-slate-400">
                                    {selectedCustomer.phone && <span className="font-mono">{selectedCustomer.phone} · </span>}
                                    {selectedCustomer.address}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSelectedCustomer(null)}
                            className="flex items-center gap-1 rounded-sm border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-100 transition"
                        >
                            <XMarkIcon className="h-3.5 w-3.5" /> Close
                        </button>
                    </div>

                    {/* Summary cards */}
                    <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
                        <div className="px-5 py-3 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total Orders</p>
                            <p className="text-lg font-bold text-slate-900">{selectedOrders.length}</p>
                        </div>
                        <div className="px-5 py-3 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Total Billed</p>
                            <p className="text-lg font-bold text-slate-900">{fmt(selectedStats.totalBilled)}</p>
                        </div>
                        <div className="px-5 py-3 text-center">
                            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Balance</p>
                            <p className={`text-lg font-bold ${selectedStats.balance > 0 ? 'text-red-600' : selectedStats.balance < 0 ? 'text-blue-600' : 'text-emerald-600'}`}>
                                {selectedStats.balance < 0
                                    ? `Depo ${fmt(Math.abs(selectedStats.balance))}`
                                    : fmt(selectedStats.balance)}
                            </p>
                        </div>
                    </div>

                    {/* Transactions table */}
                    {ordersLoading ? (
                        <div className="py-10 text-center text-[11px] text-slate-400">Loading transactions…</div>
                    ) : selectedOrders.length === 0 ? (
                        <div className="py-10 text-center text-[11px] text-slate-400">No transactions found for this distributor.</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[11px]">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Order No</th>
                                        <th className="px-4 py-2.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Date</th>
                                        <th className="px-4 py-2.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Amount</th>
                                        <th className="px-4 py-2.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Online Paid</th>
                                        <th className="px-4 py-2.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500">Balance</th>
                                        <th className="px-4 py-2.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                        <th className="px-4 py-2.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">View</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {selectedOrders.map((order: Order, idx: number) => {
                                        const paid    = order.paidAmount || 0;
                                        const balance = order.totalAmount - paid;
                                        return (
                                            <tr key={order._id} className="hover:bg-slate-50/60 transition-colors">
                                                <td className="px-4 py-2.5 text-slate-400">{idx + 1}</td>
                                                <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">
                                                    #{order.orderNumber}
                                                </td>
                                                <td className="px-4 py-2.5 text-slate-500">
                                                    {dayjs(order.createdAt).format('DD MMM YYYY')}
                                                </td>
                                                <td className="px-4 py-2.5 text-right font-semibold text-slate-800">
                                                    {fmt(order.totalAmount)}
                                                </td>
                                                <td className="px-4 py-2.5 text-right text-slate-600">
                                                    {paid > 0 ? fmt(paid) : '—'}
                                                </td>
                                                <td className={`px-4 py-2.5 text-right font-semibold ${
                                                    balance > 0 ? 'text-red-600' : balance < 0 ? 'text-blue-600' : 'text-emerald-600'
                                                }`}>
                                                    {balance === 0 ? '—' : balance < 0 ? `Depo ${fmt(Math.abs(balance))}` : fmt(balance)}
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <StatusBadge status={order.status} />
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <button
                                                        onClick={() => setViewInvoiceId(order._id)}
                                                        className="inline-flex items-center justify-center rounded-sm border border-slate-200 p-1.5 text-slate-500 hover:bg-brand/10 hover:border-brand/30 hover:text-brand transition"
                                                        title="View invoice"
                                                    >
                                                        <EyeIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Invoice modal */}
            {viewInvoiceId && (
                <InvoiceModal orderId={viewInvoiceId} onClose={() => setViewInvoiceId(null)} />
            )}
        </div>
    );
};

export default CustomersPage;
