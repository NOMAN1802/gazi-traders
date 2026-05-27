import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useGetStockIntakesQuery } from '@/services/stockIntakesApi';

const STATUS_OPTIONS = [
    { value: '', label: 'All Status' },
    { value: 'complete', label: 'Complete' },
    { value: 'partial', label: 'Partial' },
];

export default function StockIntakeListPage() {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [searchInput, setSearchInput] = useState('');
    const [status, setStatus] = useState('');
    const limit = 15;

    const { data, isLoading } = useGetStockIntakesQuery({ page, limit, search, status });

    const intakes = data?.result ?? [];
    const total = data?.meta?.total ?? 0;
    const totalPages = Math.ceil(total / limit);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Stock Intakes</h1>
                    <p className="text-sm text-slate-500 mt-1">Track ordered vs received stock</p>
                </div>
                <Link
                    to="/stock-intake/add"
                    className="inline-flex items-center gap-2 rounded-sm bg-brand px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-brand-dark transition-colors"
                >
                    <PlusIcon className="h-4 w-4" />
                    Add Stock
                </Link>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                    <div className="relative flex-1">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by intake number..."
                            value={searchInput}
                            onChange={(e) => setSearchInput(e.target.value)}
                            className="w-full rounded-sm border border-slate-200 bg-white pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                        />
                    </div>
                    <button
                        type="submit"
                        className="rounded-sm bg-slate-800 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-900 transition-colors"
                    >
                        Search
                    </button>
                </form>
                <select
                    value={status}
                    onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                    className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                >
                    {STATUS_OPTIONS.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            {['#', 'Intake No.', 'Date', 'Items', 'Ordered Pcs', 'Received Pcs', 'Pending Pcs', 'Status', 'Action'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={9} className="py-12 text-center text-sm text-slate-500">Loading...</td>
                            </tr>
                        ) : intakes.length === 0 ? (
                            <tr>
                                <td colSpan={9} className="py-12 text-center text-sm text-slate-500">No stock intakes found.</td>
                            </tr>
                        ) : intakes.map((intake, idx) => {
                            const orderedPcs = intake.items.reduce((s, i) => s + i.orderedPieces, 0);
                            const receivedPcs = intake.items.reduce((s, i) => s + i.receivedPieces, 0);
                            const pendingPcs = intake.items.reduce((s, i) => s + i.pendingPieces, 0);
                            const isPartial = intake.status === 'partial';

                            return (
                                <tr
                                    key={intake._id}
                                    className={isPartial ? 'bg-amber-50 hover:bg-amber-100/60' : 'hover:bg-slate-50'}
                                >
                                    <td className="px-4 py-3 text-sm text-slate-500">
                                        {(page - 1) * limit + idx + 1}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                                        {intake.intakeNumber}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {new Date(intake.createdAt).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-600">
                                        {intake.items.length} item{intake.items.length !== 1 ? 's' : ''}
                                    </td>
                                    <td className="px-4 py-3 text-sm text-slate-700 font-medium">
                                        {orderedPcs.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold text-emerald-700">
                                        {receivedPcs.toLocaleString()}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold">
                                        {pendingPcs > 0 ? (
                                            <span className="text-red-600">{pendingPcs.toLocaleString()}</span>
                                        ) : (
                                            <span className="text-slate-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                            isPartial
                                                ? 'bg-amber-100 text-amber-700'
                                                : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {isPartial ? 'Partial' : 'Complete'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link
                                            to={`/stock-intake/${intake._id}`}
                                            className="inline-flex items-center gap-1 rounded-sm px-2.5 py-1.5 text-xs font-medium text-brand border border-brand/30 hover:bg-brand/5 transition-colors"
                                        >
                                            <EyeIcon className="h-3.5 w-3.5" />
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Summary + Pagination */}
            {!isLoading && intakes.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-600">
                    <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total} records</span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-sm border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="font-medium">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="rounded-sm border border-slate-200 px-3 py-1.5 text-xs font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
