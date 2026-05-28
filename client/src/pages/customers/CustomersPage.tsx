import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon,
    BuildingOffice2Icon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetCustomersQuery, useDeleteCustomerMutation, type Customer } from '@/services/customersApi';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';

function initials(name: string) {
    return name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

// Deterministic avatar colour from name
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
    const [addressFilter, setAddressFilter] = useState<string | null>(null);

    const { data, isLoading, isError, refetch } = useGetCustomersQuery({ limit: 1000 });
    const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

    const customers = useMemo(() => data?.customers ?? [], [data]);

    // Derive unique addresses for the filter chips
    const uniqueAddresses = useMemo(() => {
        const seen = new Set<string>();
        const list: string[] = [];
        for (const c of customers) {
            const addr = c.address?.trim();
            if (addr && !seen.has(addr)) { seen.add(addr); list.push(addr); }
        }
        return list;
    }, [customers]);

    // Cards: apply search only (address chip filtering is for the bottom table)
    const visibleCards = useMemo(() => {
        if (!search.trim()) return customers;
        const q = search.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.address?.toLowerCase().includes(q),
        );
    }, [customers, search]);

    // Bottom table: customers sharing the selected address
    const tableRows = useMemo(
        () => addressFilter ? customers.filter(c => c.address?.trim() === addressFilter) : [],
        [customers, addressFilter],
    );

    const handleCardClick = (c: Customer) => {
        const addr = c.address?.trim();
        if (!addr) return;
        setAddressFilter(prev => (prev === addr ? null : addr));
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete distributor "${name}"?`)) return;
        try {
            await deleteCustomer(id).unwrap();
            toast.success('Distributor deleted');
        } catch {
            toast.error('Failed to delete distributor');
        }
    };

    if (isLoading) return <Loader fullScreen message="Loading distributors..." />;
    if (isError) return <ErrorState description="Unable to load distributors" onRetry={refetch} />;

    return (
        <div className="space-y-4">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-brand">Partners</p>
                    <h1 className="mt-0.5 text-2xl font-bold text-slate-900">
                        {addressFilter
                            ? `${tableRows.length} in ${addressFilter}`
                            : `${customers.length} Distributors`}
                    </h1>
                    <p className="text-xs text-slate-500">
                        Click a card to see all distributors at the same address.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/customers/new')}
                    className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-3 py-2 text-xs font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition"
                >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add Distributor
                </button>
            </div>

            {/* Search + address chips */}
            <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm space-y-3">
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

                {uniqueAddresses.length > 0 && (
                    <div>
                        <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                            Filter by address
                        </p>
                        <div className="flex flex-wrap gap-2">
                            <button
                                onClick={() => setAddressFilter(null)}
                                className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition ${
                                    !addressFilter
                                        ? 'bg-brand border-brand text-white shadow-sm'
                                        : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                                }`}
                            >
                                <BuildingOffice2Icon className="h-3.5 w-3.5" />
                                All Areas
                                <span className={`text-[9px] ${!addressFilter ? 'opacity-70' : 'text-slate-400'}`}>
                                    {customers.length}
                                </span>
                            </button>
                            {uniqueAddresses.map(addr => {
                                const count = customers.filter(c => c.address?.trim() === addr).length;
                                const isOn = addressFilter === addr;
                                return (
                                    <button
                                        key={addr}
                                        onClick={() => setAddressFilter(prev => prev === addr ? null : addr)}
                                        className={`flex items-center gap-1.5 rounded-sm border px-3 py-1.5 text-xs font-semibold transition ${
                                            isOn
                                                ? 'bg-brand border-brand text-white shadow-sm'
                                                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-brand/40 hover:bg-white'
                                        }`}
                                    >
                                        <BuildingOffice2Icon className="h-3.5 w-3.5" />
                                        <span className="max-w-[140px] truncate">{addr}</span>
                                        <span className={`text-[9px] ${isOn ? 'opacity-70' : 'text-slate-400'}`}>
                                            {count}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            {/* Distributor cards */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {visibleCards.map(c => {
                    const { bg, text } = avatarColor(c.name);
                    const isActive = addressFilter === c.address?.trim();
                    return (
                        <div
                            key={c._id}
                            onClick={() => handleCardClick(c)}
                            className={`rounded-sm border bg-white p-4 shadow-sm cursor-pointer transition-all duration-150 ${
                                isActive
                                    ? 'border-brand/40 ring-2 ring-brand/20 shadow-md'
                                    : 'border-slate-200/60 hover:border-slate-300 hover:shadow-md'
                            }`}
                        >
                            {/* Head */}
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
                                    c.status === 'active'
                                        ? 'bg-emerald-50 text-emerald-700'
                                        : 'bg-slate-100 text-slate-500'
                                }`}>
                                    {c.status}
                                </span>
                            </div>

                            {/* Address */}
                            {c.address && (
                                <div className="mt-2.5 flex items-start gap-1.5">
                                    <BuildingOffice2Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-0.5" />
                                    <span className="text-xs text-slate-600 leading-snug">{c.address}</span>
                                    <span
                                        className="ml-auto shrink-0 text-[10px] font-semibold"
                                        style={{ color: isActive ? '#5C6CFF' : '#94A3B8' }}
                                    >
                                        →
                                    </span>
                                </div>
                            )}

                            {/* Edit / delete actions */}
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
                    <div className="col-span-full py-12 text-center text-sm text-slate-400">
                        {search ? 'No distributors match your search.' : 'No distributors yet.'}
                    </div>
                )}
            </div>

            {/* Address-group table — shown when a card (or chip) is clicked */}
            {addressFilter && (
                <div className="rounded-sm border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                        <div>
                            <h3 className="text-xs font-semibold text-slate-700">
                                Distributors at
                                <span className="ml-1.5 font-bold text-brand">{addressFilter}</span>
                            </h3>
                            <p className="text-[10px] text-slate-400 mt-0.5">{tableRows.length} distributor{tableRows.length !== 1 ? 's' : ''}</p>
                        </div>
                        <button
                            onClick={() => setAddressFilter(null)}
                            className="flex items-center gap-1 rounded-sm border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-500 hover:bg-slate-50 transition"
                        >
                            <XMarkIcon className="h-3 w-3" /> Clear
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead className="bg-slate-50/80 border-b border-slate-100">
                                <tr>
                                    <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                                    <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Name</th>
                                    <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">Phone</th>
                                    <th className="px-4 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Address</th>
                                    <th className="px-4 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                    <th className="px-4 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tableRows.map((c, idx) => {
                                    const { bg, text } = avatarColor(c.name);
                                    return (
                                        <tr key={c._id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-slate-400">{idx + 1}</td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-[10px] font-bold"
                                                        style={{ background: bg, color: text }}
                                                    >
                                                        {initials(c.name)}
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{c.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 font-mono text-slate-500 hidden sm:table-cell">
                                                {c.phone || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate">
                                                {c.address || '—'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[9px] font-semibold ${
                                                    c.status === 'active'
                                                        ? 'bg-emerald-50 text-emerald-700'
                                                        : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                    {c.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <div className="flex items-center justify-center gap-1.5" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => navigate(`/customers/${c._id}/edit`)}
                                                        disabled={!canEditDelete}
                                                        className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition disabled:opacity-40"
                                                    >
                                                        <PencilIcon className="h-3 w-3" /> Edit
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(c._id, c.name)}
                                                        disabled={isDeleting || !canEditDelete}
                                                        className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-2.5 py-1 text-[10px] font-semibold text-slate-600 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition disabled:opacity-40"
                                                    >
                                                        <TrashIcon className="h-3 w-3" /> Delete
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomersPage;
