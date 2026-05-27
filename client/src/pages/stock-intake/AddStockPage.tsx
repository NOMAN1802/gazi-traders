/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useGetProductsQuery } from '@/services/productsApi';
import { useGetSuppliersQuery } from '@/services/suppliersApi';
import { useCreateStockIntakeMutation } from '@/services/stockIntakesApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';

type IntakeRow = {
    productId: string;
    orderedInput: string;
    cartoonSize: string;
};

const getPieces = (qty: number, unit: string, cartoonSize: number): number => {
    if (unit === 'Dozen') return Math.round(qty * 12);
    if (unit === 'Cartoon') return Math.round(qty * cartoonSize);
    return qty;
};

const AddStockPage = () => {
    const navigate = useNavigate();
    const [createStockIntake, { isLoading }] = useCreateStockIntakeMutation();

    const [selectedFactory, setSelectedFactory] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [rows, setRows] = useState<IntakeRow[]>([]);
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});

    const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSuppliersQuery({ limit: 100 });
    const factories = suppliersData?.suppliers ?? [];

    const { data: productsData, isLoading: isLoadingProducts, isError } = useGetProductsQuery(
        { search: searchTerm, limit: 200, page: 1, supplierId: selectedFactory || undefined },
        { skip: !selectedFactory }
    );

    const products = useMemo(() => productsData?.products ?? [], [productsData?.products]);

    const handleProductToggle = useCallback((productId: string) => {
        const next = new Set(selectedProductIds);
        if (next.has(productId)) {
            next.delete(productId);
            setRows(r => r.filter(x => x.productId !== productId));
        } else {
            next.add(productId);
            const p = products.find(x => x._id === productId);
            if (p) {
                setRows(r => [...r, {
                    productId,
                    orderedInput: '',
                    cartoonSize: p.cartoonSize ? String(p.cartoonSize) : '',
                }]);
            }
        }
        setSelectedProductIds(next);
    }, [selectedProductIds, products]);

    const handleUpdate = useCallback((productId: string, field: keyof IntakeRow, value: string) => {
        setRows(r => r.map(x => x.productId !== productId ? x : { ...x, [field]: value }));
        const key = `${productId}-${field}`;
        if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e; });
    }, [errors]);

    const handleRemove = useCallback((productId: string) => {
        setRows(r => r.filter(x => x.productId !== productId));
        setSelectedProductIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
    }, []);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};
        if (rows.length === 0) newErrors.general = 'Select at least one product';

        rows.forEach(row => {
            const product = products.find(p => p._id === row.productId);
            if (!row.orderedInput || Number(row.orderedInput) <= 0) {
                newErrors[`${row.productId}-orderedInput`] = 'Required';
            }
            if (product?.unit === 'Cartoon' && (!row.cartoonSize || Number(row.cartoonSize) <= 0)) {
                newErrors[`${row.productId}-cartoonSize`] = 'Required';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) {
            toast.error('Please fix validation errors');
            return;
        }

        try {
            const items = rows.map(row => {
                const product = products.find(p => p._id === row.productId)!;
                const ctnSize = Number(row.cartoonSize) || 0;
                const orderedQty = Number(row.orderedInput);
                const orderedPieces = getPieces(orderedQty, product.unit, ctnSize);

                return {
                    product: product._id,
                    productName: product.name,
                    categoryName: product.categoryName,
                    unit: product.unit as 'Dozen' | 'Cartoon',
                    cartoonSize: product.unit === 'Cartoon' ? ctnSize : undefined,
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
                description: `${items.reduce((s, i) => s + i.orderedPieces, 0).toLocaleString()} pcs added to stock.`,
            });

            navigate('/stock-intake');
        } catch (err: any) {
            toast.error('Failed to record stock', { description: err?.data?.message || 'Please try again.' });
        }
    };

    if (isLoadingSuppliers) return <Loader fullScreen message="Loading factories..." />;
    if (isError) return <ErrorState title="Failed to load products" onRetry={() => window.location.reload()} />;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/stock-intake')}
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Inventory</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Add Stock</h1>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Factory Selector */}
                <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">
                        Select Factory <span className="text-danger">*</span>
                    </label>
                    <select
                        value={selectedFactory}
                        onChange={(e) => {
                            setSelectedFactory(e.target.value);
                            setSelectedProductIds(new Set());
                            setRows([]);
                            setSearchTerm('');
                        }}
                        className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                    >
                        <option value="">— Choose a factory —</option>
                        {factories.map(f => (
                            <option key={f._id} value={f._id}>{f.name}</option>
                        ))}
                    </select>
                    {!selectedFactory && errors.general && (
                        <p className="mt-1 text-[10px] text-danger">{errors.general}</p>
                    )}
                </div>

                {/* Product Search — only after factory selected */}
                {selectedFactory && (
                <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Search Products</label>
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                            placeholder="Search by name, SKU or category..."
                        />
                    </div>
                    {errors.general && <p className="mt-1 text-[10px] text-danger">{errors.general}</p>}
                </div>
                )}

                {/* Select Products */}
                {selectedFactory && (
                <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-700 mb-2">Select Products</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">S/N</th>
                                    <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Product</th>
                                    <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Category</th>
                                    <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Unit</th>
                                    <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Stock (pcs)</th>
                                    <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {isLoadingProducts ? (
                                    <tr><td colSpan={6} className="px-2 py-4 text-center text-xs text-slate-500">Loading products...</td></tr>
                                ) : products.length === 0 ? (
                                    <tr><td colSpan={6} className="px-2 py-3 text-center text-xs text-slate-500">No products linked to this factory</td></tr>
                                ) : products.map((product, idx) => {
                                    const isSelected = selectedProductIds.has(product._id);
                                    return (
                                        <tr key={product._id} className={isSelected ? 'bg-brand/5' : 'hover:bg-slate-50'}>
                                            <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                                            <td className="px-2 py-1.5">
                                                <div className="font-medium text-slate-900">{product.name}</div>
                                                {product.sku && <div className="text-[10px] text-slate-400">SKU: {product.sku}</div>}
                                            </td>
                                            <td className="px-2 py-1.5 text-slate-600">{product.categoryName || '—'}</td>
                                            <td className="px-2 py-1.5 text-center">
                                                <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[9px] font-semibold ${product.unit === 'Dozen' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                    {product.unit}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1.5 text-center font-semibold text-slate-900">{product.stockQuantity}</td>
                                            <td className="px-2 py-1.5 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => handleProductToggle(product._id)}
                                                    className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-semibold transition ${isSelected ? 'text-danger bg-red-50 hover:bg-red-100' : 'text-white bg-brand hover:bg-brand-dark'}`}
                                                >
                                                    {isSelected ? 'Remove' : 'Add'}
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
                )}

                {/* Stock Details Table */}
                {rows.length > 0 && (
                    <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-700">Stock Details</h3>
                            <span className="text-[10px] text-slate-500">{rows.length} product{rows.length !== 1 ? 's' : ''} selected</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">S/N</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Product</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Category</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Unit</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Ctn Size</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Ordered</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Pieces</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {rows.map((row, idx) => {
                                        const product = products.find(p => p._id === row.productId);
                                        if (!product) return null;
                                        const isCartoon = product.unit === 'Cartoon';
                                        const ctnSize = Number(row.cartoonSize) || 0;
                                        const ordered = Number(row.orderedInput) || 0;
                                        const pieces = getPieces(ordered, product.unit, ctnSize);

                                        return (
                                            <tr key={row.productId} className="hover:bg-slate-50/70">
                                                <td className="px-2 py-2 text-slate-400">{idx + 1}</td>
                                                <td className="px-2 py-2">
                                                    <div className="font-medium text-slate-900 whitespace-nowrap">{product.name}</div>
                                                    {product.sku && <div className="text-[10px] text-slate-400">SKU: {product.sku}</div>}
                                                </td>
                                                <td className="px-2 py-2 text-slate-600 whitespace-nowrap">{product.categoryName || '—'}</td>
                                                <td className="px-2 py-2 text-center">
                                                    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[9px] font-semibold ${product.unit === 'Dozen' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                        {product.unit}
                                                    </span>
                                                </td>

                                                {/* Cartoon Size */}
                                                <td className="px-2 py-2 text-center">
                                                    {isCartoon ? (
                                                        <>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                value={row.cartoonSize}
                                                                onChange={(e) => handleUpdate(row.productId, 'cartoonSize', e.target.value)}
                                                                className={`w-16 rounded border ${errors[`${row.productId}-cartoonSize`] ? 'border-danger' : 'border-slate-200'} bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none`}
                                                                placeholder="pcs"
                                                            />
                                                            {errors[`${row.productId}-cartoonSize`] && (
                                                                <p className="text-[9px] text-danger">{errors[`${row.productId}-cartoonSize`]}</p>
                                                            )}
                                                        </>
                                                    ) : <span className="text-slate-300">—</span>}
                                                </td>

                                                {/* Ordered */}
                                                <td className="px-2 py-2 text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={row.orderedInput}
                                                        onChange={(e) => handleUpdate(row.productId, 'orderedInput', e.target.value)}
                                                        disabled={isCartoon && !row.cartoonSize}
                                                        className={`w-16 rounded border ${errors[`${row.productId}-orderedInput`] ? 'border-danger' : 'border-slate-200'} bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none disabled:opacity-50`}
                                                        placeholder={isCartoon ? 'Ctn' : 'Doz'}
                                                    />
                                                    {errors[`${row.productId}-orderedInput`] && (
                                                        <p className="text-[9px] text-danger">{errors[`${row.productId}-orderedInput`]}</p>
                                                    )}
                                                </td>

                                                {/* Pieces (read-only) */}
                                                <td className="px-2 py-2 text-center">
                                                    <span className={`text-xs font-semibold ${pieces > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                                                        {pieces > 0 ? pieces.toLocaleString() : '—'}
                                                    </span>
                                                </td>

                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemove(row.productId)}
                                                        className="inline-flex items-center p-1 rounded text-danger hover:bg-red-50 transition"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary */}
                        <div className="mt-3 pt-3 border-t border-slate-100 flex justify-center text-xs">
                            <div className="rounded-sm bg-emerald-50 px-8 py-2 text-center">
                                <div className="text-[10px] text-emerald-600 uppercase tracking-wide">Total Pieces</div>
                                <div className="font-bold text-emerald-700">
                                    {rows.reduce((s, row) => {
                                        const p = products.find(x => x._id === row.productId);
                                        return s + getPieces(Number(row.orderedInput) || 0, p?.unit ?? '', Number(row.cartoonSize) || 0);
                                    }, 0).toLocaleString()} pcs
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Notes + Actions */}
                {rows.length > 0 && (
                    <>
                        <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                            <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                            <textarea
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                rows={2}
                                className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20 resize-none"
                                placeholder="Any remarks about this stock intake..."
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => navigate('/stock-intake')}
                                className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? 'Saving...' : 'Record Stock Intake'}
                            </button>
                        </div>
                    </>
                )}
            </form>
        </div>
    );
};

export default AddStockPage;
