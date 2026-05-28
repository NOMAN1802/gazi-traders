/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, TrashIcon, DocumentPlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useGetProductsQuery } from '@/services/productsApi';
import { useGetSuppliersQuery } from '@/services/suppliersApi';
import { useCreateStockIntakeMutation } from '@/services/stockIntakesApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import ProductLineTabs from '@/components/common/ProductLineTabs';

type IntakeRow = { orderedInput: string; cartoonSize: string };

const getPieces = (qty: number, unit: string, cartoonSize: number): number => {
    if (unit === 'Dozen') return Math.round(qty * 12);
    if (unit === 'Cartoon') return Math.round(qty * cartoonSize);
    return qty;
};

const AddStockPage = () => {
    const navigate = useNavigate();
    const [createStockIntake, { isLoading }] = useCreateStockIntakeMutation();

    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState<Record<string, IntakeRow>>({});
    const [notes, setNotes] = useState('');

    const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSuppliersQuery({ limit: 100 });
    const activeSuppliers = useMemo(
        () => (suppliersData?.suppliers ?? []).filter(s => s.status === 'active'),
        [suppliersData],
    );

    // Auto-select first supplier once loaded
    const resolvedId = selectedSupplierId || activeSuppliers[0]?._id || '';

    const { data: productsData, isLoading: isLoadingProducts, isError } = useGetProductsQuery(
        { limit: 200, page: 1, supplierId: resolvedId || undefined },
        { skip: !resolvedId },
    );
    const products = useMemo(() => productsData?.products ?? [], [productsData]);

    const filtered = useMemo(
        () => !search.trim()
            ? products
            : products.filter(p =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.categoryName ?? '').toLowerCase().includes(search.toLowerCase()),
            ),
        [products, search],
    );

    const update = useCallback((id: string, field: keyof IntakeRow, value: string, defaults: IntakeRow) => {
        setRows(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaults), [field]: value } }));
    }, []);

    const remove = useCallback((id: string) => {
        setRows(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, []);

    const onSwitchSupplier = (nextId: string) => {
        const hasRows = Object.values(rows).some(r => Number(r.orderedInput) > 0);
        if (hasRows) {
            const ok = window.confirm("Switching factories will clear the items you've added. Continue?");
            if (!ok) return;
        }
        setSelectedSupplierId(nextId);
        setRows({});
        setSearch('');
    };

    const totals = useMemo(() => {
        let items = 0, pieces = 0, cartons = 0, dozens = 0;
        for (const p of products) {
            const r = rows[p._id];
            if (!r) continue;
            const qty = Number(r.orderedInput) || 0;
            if (qty <= 0) continue;
            items += 1;
            if (p.unit === 'Cartoon') {
                const sz = Number(r.cartoonSize) || p.cartoonSize || 0;
                cartons += qty;
                pieces += qty * sz;
            } else {
                dozens += qty;
                pieces += qty * 12;
            }
        }
        return { items, pieces, cartons, dozens };
    }, [rows, products]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (totals.items === 0) {
            toast.error('Nothing to record', { description: 'Enter at least one quantity above.' });
            return;
        }
        try {
            const items = products
                .filter(p => Number(rows[p._id]?.orderedInput) > 0)
                .map(p => {
                    const r = rows[p._id]!;
                    const orderedQty = Number(r.orderedInput);
                    const ctnSize = p.unit === 'Cartoon'
                        ? (Number(r.cartoonSize) || p.cartoonSize || 0)
                        : 0;
                    const orderedPieces = getPieces(orderedQty, p.unit, ctnSize);
                    return {
                        product: p._id,
                        productName: p.name,
                        categoryName: p.categoryName,
                        unit: p.unit as 'Dozen' | 'Cartoon',
                        cartoonSize: p.unit === 'Cartoon' ? ctnSize : undefined,
                        orderedQty,
                        receivedQty: orderedQty,
                        pendingQty: 0,
                        orderedPieces,
                        receivedPieces: orderedPieces,
                        pendingPieces: 0,
                    };
                });

            const result = await createStockIntake({ items, notes: notes || undefined }).unwrap();
            toast.success(`Stock recorded — ${result.intakeNumber}`, {
                description: `${totals.items} item(s) · ${totals.pieces.toLocaleString()} pcs added.`,
            });
            navigate('/stock-intake');
        } catch (err: any) {
            toast.error('Failed to record stock', { description: err?.data?.message || 'Please try again.' });
        }
    };

    if (isLoadingSuppliers) return <Loader fullScreen message="Loading factories..." />;
    if (isError) return <ErrorState title="Failed to load products" onRetry={() => window.location.reload()} />;

    const currentSupplier = activeSuppliers.find(s => s._id === resolvedId);

    return (
        <div className="space-y-4">
            {/* Factory tabs */}
            <ProductLineTabs
                value={resolvedId}
                onChange={onSwitchSupplier}
                suppliers={activeSuppliers}
            />

            {/* Factory info + search */}
            <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-brand">
                            Factory
                        </p>
                        <h2 className="mt-0.5 text-sm font-bold text-slate-900">
                            {currentSupplier?.name ?? '—'}
                        </h2>
                        <p className="text-xs text-slate-500">
                            Enter Dozen or Cartoon Qty for each item — pieces auto-compute.
                        </p>
                    </div>
                    <div className="relative w-full max-w-xs">
                        <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={`Search ${currentSupplier?.name.split(' ')[0] ?? ''} products…`}
                            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                        />
                    </div>
                </div>
            </div>

            {/* Inline product table */}
            <div className="rounded-sm border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-700">
                        Stock Intake Lines
                        <span className="ml-1.5 font-normal text-slate-400">· fill a row to add an item</span>
                    </h3>
                    <span className="text-[10px] text-slate-400">
                        {filtered.length} of {products.length}
                    </span>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="overflow-x-auto">
                        {isLoadingProducts ? (
                            <div className="py-12 text-center text-xs text-slate-400">Loading products…</div>
                        ) : !resolvedId ? (
                            <div className="py-12 text-center text-xs text-slate-400">
                                Select a factory above to see products.
                            </div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                                        <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Product</th>
                                        <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 hidden md:table-cell">Category</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-28">Qty</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-20 hidden sm:table-cell">Ctn Size</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-24">Pieces</th>
                                        <th className="px-3 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((p, idx) => {
                                        const defaults: IntakeRow = {
                                            orderedInput: '',
                                            cartoonSize: p.cartoonSize ? String(p.cartoonSize) : '',
                                        };
                                        const r = rows[p._id] ?? defaults;
                                        const qty = Number(r.orderedInput) || 0;
                                        const sz = Number(r.cartoonSize) || p.cartoonSize || 0;
                                        const pcs = getPieces(qty, p.unit, sz);
                                        const isActive = qty > 0;

                                        return (
                                            <tr
                                                key={p._id}
                                                className={isActive ? 'bg-brand/5' : 'hover:bg-slate-50/50'}
                                            >
                                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-slate-900">{p.name}</div>
                                                    {p.categoryName && (
                                                        <div className="text-[10px] text-slate-400 md:hidden">
                                                            {p.categoryName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-slate-500 hidden md:table-cell">
                                                    {p.categoryName || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={r.orderedInput}
                                                            onChange={e =>
                                                                update(p._id, 'orderedInput', e.target.value, defaults)
                                                            }
                                                            placeholder="0"
                                                            className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        />
                                                        <span
                                                            className={`text-[9px] font-medium ${
                                                                p.unit === 'Dozen'
                                                                    ? 'text-blue-500'
                                                                    : 'text-orange-500'
                                                            }`}
                                                        >
                                                            {p.unit === 'Dozen' ? 'doz' : 'ctn'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-3 py-2 text-center hidden sm:table-cell">
                                                    {p.unit === 'Cartoon' ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={r.cartoonSize}
                                                            onChange={e =>
                                                                update(p._id, 'cartoonSize', e.target.value, defaults)
                                                            }
                                                            placeholder="sz"
                                                            className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300">× 12</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <span
                                                        className={`font-semibold tabular-nums ${
                                                            pcs > 0 ? 'text-emerald-700' : 'text-slate-300'
                                                        }`}
                                                    >
                                                        {pcs > 0 ? pcs.toLocaleString() : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    {isActive && (
                                                        <button
                                                            type="button"
                                                            onClick={() => remove(p._id)}
                                                            className="inline-flex items-center p-1 rounded text-slate-400 hover:text-danger hover:bg-red-50 transition"
                                                            aria-label="Clear row"
                                                        >
                                                            <TrashIcon className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {filtered.length === 0 && (
                                        <tr>
                                            <td colSpan={7} className="py-10 text-center text-xs text-slate-400">
                                                {products.length === 0
                                                    ? 'No products linked to this factory.'
                                                    : 'No products match your search.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Summary strip */}
                    <div className="border-t border-slate-100 bg-slate-50/80 px-4 py-3 grid grid-cols-3 gap-4">
                        <div>
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Items
                            </div>
                            <div className="mt-0.5 text-sm font-bold text-slate-900">{totals.items}</div>
                        </div>
                        <div>
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                {totals.cartons > 0 ? 'Cartons' : 'Dozens'}
                            </div>
                            <div className="mt-0.5 text-sm font-bold text-slate-900">
                                {totals.cartons > 0 ? totals.cartons : totals.dozens}
                            </div>
                        </div>
                        <div>
                            <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Total Pieces
                            </div>
                            <div className="mt-0.5 text-base font-bold text-emerald-700">
                                {totals.pieces.toLocaleString()}{' '}
                                <span className="text-xs font-medium">pcs</span>
                            </div>
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="border-t border-slate-100 px-4 py-3">
                        <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Notes <span className="font-normal text-slate-400">(optional)</span>
                        </label>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={2}
                            className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20 resize-none"
                            placeholder="Any remarks about this stock intake…"
                        />
                    </div>

                    {/* Actions */}
                    <div className="border-t border-slate-100 px-4 py-3 flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => { setRows({}); setNotes(''); }}
                            className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                        >
                            Discard
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <DocumentPlusIcon className="h-3.5 w-3.5" />
                            {isLoading ? 'Saving…' : 'Record Stock Intake'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStockPage;
