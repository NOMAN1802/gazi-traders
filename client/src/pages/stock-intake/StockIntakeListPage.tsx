import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PlusIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useGetStockIntakesQuery, type StockIntake } from '@/services/stockIntakesApi';

const FACTORIES = [
    { label: 'Takdum Limited',          unit: 'Dozen',   qtyLabel: 'Dozen (Qty)' },
    { label: 'Prome Agro Food Limited', unit: 'Cartoon', qtyLabel: 'Ctr (Qty)'   },
] as const;

const STATUS_OPTIONS = [
    { value: '',         label: 'All Status' },
    { value: 'complete', label: 'Complete'   },
    { value: 'partial',  label: 'Partial'    },
];

const PAGE_SIZE = 15;

// An intake belongs to a factory if the majority of its items use that unit
function belongsTo(intake: StockIntake, unit: string) {
    const withUnit = intake.items.filter(i => i.unit);
    if (withUnit.length === 0) return false;
    return withUnit.filter(i => i.unit === unit).length >= withUnit.length / 2;
}

export default function StockIntakeListPage() {
    const [activeTab, setActiveTab]       = useState(0);
    const [page, setPage]                 = useState(1);
    const [search, setSearch]             = useState('');
    const [searchInput, setSearchInput]   = useState('');
    const [status, setStatus]             = useState('');

    // Load all records — client-side tab filtering handles per-factory pagination
    const { data, isLoading } = useGetStockIntakesQuery({ limit: 10000 });
    const allIntakes = data?.result ?? [];

    const factory = FACTORIES[activeTab];

    const filtered = useMemo(() => {
        let list = allIntakes.filter(i => belongsTo(i, factory.unit));
        if (status) list = list.filter(i => i.status === status);
        if (search) {
            const q = search.toLowerCase();
            list = list.filter(i => i.intakeNumber.toLowerCase().includes(q));
        }
        return list;
    }, [allIntakes, factory, status, search]);

    const totalPages  = Math.ceil(filtered.length / PAGE_SIZE);
    const pageIntakes = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setSearch(searchInput);
        setPage(1);
    };

    const switchTab = (idx: number) => {
        setActiveTab(idx);
        setPage(1);
        setSearch('');
        setSearchInput('');
        setStatus('');
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-xl font-bold text-slate-900">Stock Intakes</h1>
                    <p className="text-xs text-slate-500 mt-0.5">Track ordered vs received stock</p>
                </div>
                <Link
                    to="/stock-intake/add"
                    className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-3 py-2 text-xs font-semibold text-white shadow hover:bg-brand-dark transition-colors"
                >
                    <PlusIcon className="h-3.5 w-3.5" />
                    Add Stock
                </Link>
            </div>

            {/* Factory Tabs */}
            <div className="rounded-sm border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-100 overflow-x-auto">
                    {FACTORIES.map((f, i) => (
                        <button
                            key={f.label}
                            type="button"
                            onClick={() => switchTab(i)}
                            className={`flex shrink-0 items-center gap-2 px-5 py-2.5 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap -mb-px ${
                                activeTab === i
                                    ? 'border-brand text-brand bg-brand/5'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {f.label}
                            <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${activeTab === i ? 'bg-brand text-white' : 'bg-slate-100 text-slate-500'}`}>
                                {allIntakes.filter(int => belongsTo(int, f.unit)).length}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-2 p-3">
                    <form onSubmit={handleSearch} className="flex flex-1 gap-2">
                        <div className="relative flex-1">
                            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by intake number..."
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
                            />
                        </div>
                        <button
                            type="submit"
                            className="rounded-sm bg-slate-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-900 transition-colors"
                        >
                            Search
                        </button>
                    </form>
                    <select
                        value={status}
                        onChange={(e) => { setStatus(e.target.value); setPage(1); }}
                        className="rounded-sm border border-slate-200 bg-white px-2.5 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-brand/30 focus:border-brand"
                    >
                        {STATUS_OPTIONS.map(o => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            {['#', 'Intake No.', 'Date', 'Items', factory.qtyLabel, 'Quantity (Pcs)', 'Status', 'Action'].map(h => (
                                <th key={h} className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                    {h}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {isLoading ? (
                            <tr>
                                <td colSpan={8} className="py-10 text-center text-xs text-slate-400">Loading...</td>
                            </tr>
                        ) : pageIntakes.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="py-10 text-center text-xs text-slate-400">
                                    No stock intakes found for {factory.label}.
                                </td>
                            </tr>
                        ) : pageIntakes.map((intake, idx) => {
                            const targetUnit  = factory.unit;
                            const totalQty    = intake.items
                                .filter(i => i.unit === targetUnit)
                                .reduce((s, i) => s + i.receivedQty, 0);
                            const totalPcs    = intake.items.reduce((s, i) => s + i.receivedPieces, 0);
                            const isPartial   = intake.status === 'partial';

                            return (
                                <tr
                                    key={intake._id}
                                    className={isPartial ? 'bg-amber-50 hover:bg-amber-100/50' : 'hover:bg-slate-50'}
                                >
                                    <td className="px-3 py-2 text-[10px] text-slate-400">
                                        {(page - 1) * PAGE_SIZE + idx + 1}
                                    </td>
                                    <td className="px-3 py-2 text-[10px] font-semibold text-slate-900">
                                        {intake.intakeNumber}
                                    </td>
                                    <td className="px-3 py-2 text-[10px] text-slate-600">
                                        {new Date(intake.createdAt).toLocaleDateString('en-GB', {
                                            day: '2-digit', month: 'short', year: 'numeric'
                                        })}
                                    </td>
                                    <td className="px-3 py-2 text-[10px] text-slate-600">
                                        {intake.items.length} item{intake.items.length !== 1 ? 's' : ''}
                                    </td>
                                    <td className="px-3 py-2 text-[10px] font-semibold text-slate-800">
                                        {totalQty.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2 text-[10px] font-semibold text-emerald-700">
                                        {totalPcs.toLocaleString()}
                                    </td>
                                    <td className="px-3 py-2">
                                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                                            isPartial ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                        }`}>
                                            {isPartial ? 'Partial' : 'Complete'}
                                        </span>
                                    </td>
                                    <td className="px-3 py-2">
                                        <Link
                                            to={`/stock-intake/${intake._id}`}
                                            className="inline-flex items-center gap-1 rounded-sm px-2 py-1 text-[10px] font-medium text-brand border border-brand/30 hover:bg-brand/5 transition-colors"
                                        >
                                            <EyeIcon className="h-3 w-3" />
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {!isLoading && filtered.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                    <span>
                        Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length} records
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="rounded-sm border border-slate-200 px-3 py-1 text-[10px] font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
                        >
                            Previous
                        </button>
                        <span className="font-medium">{page} / {totalPages}</span>
                        <button
                            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                            className="rounded-sm border border-slate-200 px-3 py-1 text-[10px] font-medium disabled:opacity-40 hover:bg-slate-50 transition-colors"
                        >
                            Next
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
