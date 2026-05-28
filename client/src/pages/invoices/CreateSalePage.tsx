/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    MagnifyingGlassIcon,
    TrashIcon,
    UserIcon,
    XMarkIcon,
    ChevronDownIcon,
    DocumentCheckIcon,
    PrinterIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useGetProductsQuery } from '@/services/productsApi';
import { useGetSuppliersQuery } from '@/services/suppliersApi';
import { useCreateOrderMutation, useGetCustomerBalanceQuery } from '@/services/ordersApi';
import { useGetCustomersQuery, type Customer } from '@/services/customersApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import ProductLineTabs from '@/components/common/ProductLineTabs';

type SaleRow = {
    quantityInput: string;
    cartoonSize: string;
    salePrice: string;
    free: string;
};

const getPieces = (qty: number, unit: string, cartoonSize: number): number => {
    if (unit === 'Dozen') return Math.round(qty * 12);
    if (unit === 'Cartoon') return Math.round(qty * cartoonSize);
    return qty;
};

const fmt = (n: number) =>
    '৳ ' + n.toLocaleString('en-US', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

const CreateSalePage = () => {
    const navigate = useNavigate();
    const [createOrder, { isLoading }] = useCreateOrderMutation();

    // Distributor
    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    // Factory tab + products
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [search, setSearch] = useState('');
    const [rows, setRows] = useState<Record<string, SaleRow>>({});

    // Payment
    const [discount, setDiscount] = useState('');
    const [paidAmountStr, setPaidAmountStr] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paymentDate] = useState(new Date().toISOString().split('T')[0]);

    const { data: customersData } = useGetCustomersQuery({ limit: 1000 });
    const { data: balanceData } = useGetCustomerBalanceQuery(selectedCustomer?._id ?? '', {
        skip: !selectedCustomer,
    });
    const previousDue = balanceData?.balance ?? 0;

    const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSuppliersQuery({ limit: 100 });
    const activeSuppliers = useMemo(
        () => (suppliersData?.suppliers ?? []).filter(s => s.status === 'active'),
        [suppliersData],
    );
    const resolvedId = selectedSupplierId || activeSuppliers[0]?._id || '';

    const { data: productsData, isLoading: isLoadingProducts, isError } = useGetProductsQuery(
        { limit: 200, page: 1, supplierId: resolvedId || undefined },
        { skip: !resolvedId },
    );
    const products = useMemo(() => productsData?.products ?? [], [productsData]);

    const allCustomers = useMemo(() => customersData?.customers ?? [], [customersData]);
    const filteredCustomers = useMemo(() => {
        if (!customerSearch.trim()) return allCustomers;
        const q = customerSearch.toLowerCase();
        return allCustomers.filter(c =>
            c.name.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q),
        );
    }, [allCustomers, customerSearch]);

    const filtered = useMemo(
        () => !search.trim()
            ? products
            : products.filter(p =>
                p.name.toLowerCase().includes(search.toLowerCase()) ||
                (p.categoryName ?? '').toLowerCase().includes(search.toLowerCase()),
            ),
        [products, search],
    );

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
                setCustomerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const update = useCallback((id: string, field: keyof SaleRow, value: string, defaults: SaleRow) => {
        setRows(prev => ({ ...prev, [id]: { ...(prev[id] ?? defaults), [field]: value } }));
    }, []);

    const remove = useCallback((id: string) => {
        setRows(prev => { const n = { ...prev }; delete n[id]; return n; });
    }, []);

    const onSwitchSupplier = (nextId: string) => {
        const hasRows = Object.values(rows).some(r => Number(r.quantityInput) > 0);
        if (hasRows) {
            const ok = window.confirm('Switching factories will clear the current sale lines. Continue?');
            if (!ok) return;
        }
        setSelectedSupplierId(nextId);
        setRows({});
        setSearch('');
    };

    const totals = useMemo(() => {
        let items = 0, pieces = 0, cartons = 0, subtotal = 0;
        for (const p of products) {
            const r = rows[p._id];
            if (!r) continue;
            const qty = Number(r.quantityInput) || 0;
            if (qty <= 0) continue;
            const sp = Number(r.salePrice) || 0;
            const sz = Number(r.cartoonSize) || p.cartoonSize || 0;
            const pcs = getPieces(qty, p.unit, sz);
            items += 1;
            pieces += pcs;
            if (p.unit === 'Cartoon') cartons += qty;
            subtotal += pcs * sp;
        }
        const disc = Number(discount) || 0;
        const total = Math.max(0, subtotal - disc);
        const paid = Number(paidAmountStr) || 0;
        // positive = distributor still owes; negative = depo owes back (overpaid)
        const balance = total + previousDue - paid;
        return { items, pieces, cartons, subtotal, disc, total, paid, balance };
    }, [rows, products, discount, paidAmountStr, previousDue]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCustomer) {
            toast.error('Please select a distributor');
            return;
        }
        if (totals.items === 0) {
            toast.error('No lines on this sale', { description: 'Enter at least one quantity above.' });
            return;
        }
        try {
            const orderItems = products
                .filter(p => Number(rows[p._id]?.quantityInput) > 0)
                .map(p => {
                    const r = rows[p._id]!;
                    const qty = Number(r.quantityInput);
                    const sz = p.unit === 'Cartoon' ? (Number(r.cartoonSize) || p.cartoonSize || 0) : 0;
                    const pcs = getPieces(qty, p.unit, sz);
                    const unitPrice = Number(r.salePrice) || 0;
                    const free = r.free ? Number(r.free) : undefined;
                    return {
                        product: p._id,
                        productName: p.name,
                        categoryName: p.categoryName,
                        unit: p.unit,
                        cartoonSize: p.unit === 'Cartoon' ? sz : undefined,
                        inputQty: qty,
                        quantity: pcs,
                        unitPrice,
                        totalPrice: pcs * unitPrice,
                        ...(free !== undefined && !isNaN(free) ? { free } : {}),
                    };
                });

            const paidAmount = paidAmountStr !== '' ? Number(paidAmountStr) : undefined;
            const subTotal = totals.total + previousDue;
            const status = !paidAmount || paidAmount === 0
                ? 'pending'
                : paidAmount > subTotal
                ? 'depo_due'
                : paidAmount === subTotal
                ? 'completed'
                : 'partial';

            const result = await createOrder({
                customer: {
                    name: selectedCustomer.name,
                    ...(selectedCustomer.phone && { phone: selectedCustomer.phone }),
                    ...(selectedCustomer.address && { address: selectedCustomer.address }),
                },
                customerId: selectedCustomer._id,
                items: orderItems,
                subtotal: totals.subtotal,
                totalAmount: totals.total,
                ...(totals.disc > 0 && { discount: totals.disc }),
                ...(previousDue > 0 && { previousDue }),
                ...(paidAmount !== undefined && { paidAmount }),
                ...(paymentMethod && { paymentMethod }),
                ...(paidAmount !== undefined && { paymentDate: new Date(paymentDate).toISOString() }),
                status,
            }).unwrap();

            const balanceDesc = totals.balance > 0
                ? `${fmt(totals.balance)} distributor due.`
                : totals.balance < 0
                ? `${fmt(Math.abs(totals.balance))} depo due (overpaid).`
                : 'Settled.';
            toast.success(`Invoice issued — ${result.orderNumber}`, {
                description: `${fmt(totals.total)} to ${selectedCustomer.name}. ${balanceDesc}`,
            });
            navigate('/invoices');
        } catch (err: any) {
            toast.error('Sale failed', { description: err?.data?.message || 'Please try again.' });
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

            {/* Distributor + meta */}
            <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm space-y-3">
                {/* Distributor picker */}
                <div ref={customerDropdownRef} className="relative">
                    <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
                        Distributor <span className="text-danger">*</span>
                    </label>
                    {selectedCustomer ? (
                        <div className="flex items-center justify-between rounded-sm border border-brand/30 bg-brand/5 px-3 py-2.5">
                            <div className="flex items-center gap-2.5">
                                <div className="flex h-7 w-7 items-center justify-center rounded-sm bg-brand/10">
                                    <UserIcon className="h-3.5 w-3.5 text-brand" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-900">{selectedCustomer.name}</p>
                                    <p className="text-[10px] text-slate-500">
                                        {[selectedCustomer.phone, selectedCustomer.address].filter(Boolean).join(' · ') || 'No contact info'}
                                    </p>
                                </div>
                            </div>
                            {currentSupplier && (
                                <span
                                    className="hidden sm:flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[10px] font-semibold"
                                    style={{
                                        background: '#EBF4FB',
                                        borderColor: '#cfe1f1',
                                        color: '#2B6CB0',
                                    }}
                                >
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                    Selling {currentSupplier.name.split(' ')[0]}
                                </span>
                            )}
                            <button
                                type="button"
                                onClick={() => { setSelectedCustomer(null); setCustomerSearch(''); }}
                                className="flex h-6 w-6 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                            >
                                <XMarkIcon className="h-3.5 w-3.5" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() => setCustomerDropdownOpen(o => !o)}
                            className="flex w-full items-center justify-between rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-left transition hover:border-brand/30 hover:bg-white focus:outline-none"
                        >
                            <div className="flex items-center gap-2 text-slate-400">
                                <UserIcon className="h-4 w-4" />
                                <span className="text-xs">Select distributor…</span>
                            </div>
                            <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                    )}

                    {customerDropdownOpen && !selectedCustomer && (
                        <div className="absolute z-50 mt-1 w-full rounded-sm border border-slate-200 bg-white shadow-xl">
                            <div className="p-2 border-b border-slate-100">
                                <div className="relative">
                                    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                    <input
                                        autoFocus
                                        type="text"
                                        value={customerSearch}
                                        onChange={e => setCustomerSearch(e.target.value)}
                                        placeholder="Search by name or phone…"
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                    />
                                </div>
                            </div>
                            <ul className="max-h-52 overflow-y-auto py-1">
                                {filteredCustomers.length === 0 ? (
                                    <li className="px-3 py-3 text-center text-xs text-slate-400">No distributors found</li>
                                ) : filteredCustomers.map(c => (
                                    <li key={c._id}>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setSelectedCustomer(c);
                                                setCustomerSearch('');
                                                setCustomerDropdownOpen(false);
                                            }}
                                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition"
                                        >
                                            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-slate-100">
                                                <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                                                <p className="text-[10px] text-slate-400">{c.phone || c.address || 'No contact'}</p>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Invoice date */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Invoice Date
                        </label>
                        <input
                            type="date"
                            defaultValue={paymentDate}
                            className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                            Payment Method
                        </label>
                        <select
                            value={paymentMethod}
                            onChange={e => setPaymentMethod(e.target.value)}
                            className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                        >
                            <option value="">— Optional —</option>
                            <option value="cash">Cash</option>
                            <option value="online">Online</option>
                            <option value="bank_transfer">Bank Transfer</option>
                            <option value="cheque">Cheque</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Sale lines table */}
            <div className="rounded-sm border border-slate-200/60 bg-white shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-700">
                        Sale Lines
                        <span className="ml-1.5 font-normal text-slate-400">· fill a row to add an item</span>
                    </h3>
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search…"
                            className="w-36 rounded-sm border border-slate-200 bg-slate-50 pl-6 pr-2 py-1 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                        />
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="overflow-x-auto">
                        {isLoadingProducts ? (
                            <div className="py-12 text-center text-xs text-slate-400">Loading products…</div>
                        ) : (
                            <table className="w-full text-xs">
                                <thead className="bg-slate-50/80 border-b border-slate-100">
                                    <tr>
                                        <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                                        <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Product</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-24">Qty</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-20 hidden sm:table-cell">Ctn Size</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-24">Sale / pc</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-20 hidden sm:table-cell">Pieces</th>
                                        <th className="px-3 py-2 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-28">Amount</th>
                                        <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-16 hidden md:table-cell">Free</th>
                                        <th className="px-3 py-2 w-8"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filtered.map((p, idx) => {
                                        const defaults: SaleRow = {
                                            quantityInput: '',
                                            cartoonSize: p.cartoonSize ? String(p.cartoonSize) : '',
                                            salePrice: p.sellingPrice ? String(p.sellingPrice) : '',
                                            free: '',
                                        };
                                        const r = rows[p._id] ?? defaults;
                                        const qty = Number(r.quantityInput) || 0;
                                        const sz = Number(r.cartoonSize) || p.cartoonSize || 0;
                                        const pcs = getPieces(qty, p.unit, sz);
                                        const sp = Number(r.salePrice) || 0;
                                        const amount = pcs * sp;
                                        const isActive = qty > 0;

                                        return (
                                            <tr
                                                key={p._id}
                                                className={isActive ? 'bg-brand/5' : 'hover:bg-slate-50/50'}
                                            >
                                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                                <td className="px-3 py-2">
                                                    <div className="font-medium text-slate-900">{p.name}</div>
                                                    <div className="text-[10px] text-slate-400">{p.categoryName}</div>
                                                </td>
                                                {/* Qty */}
                                                <td className="px-3 py-2 text-center">
                                                    <div className="flex items-center justify-center gap-1">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            value={r.quantityInput}
                                                            onChange={e => update(p._id, 'quantityInput', e.target.value, defaults)}
                                                            placeholder="0"
                                                            className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        />
                                                        <span className={`text-[9px] font-medium ${p.unit === 'Dozen' ? 'text-blue-500' : 'text-orange-500'}`}>
                                                            {p.unit === 'Dozen' ? 'doz' : 'ctn'}
                                                        </span>
                                                    </div>
                                                </td>
                                                {/* Ctn Size */}
                                                <td className="px-3 py-2 text-center hidden sm:table-cell">
                                                    {p.unit === 'Cartoon' ? (
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            value={r.cartoonSize}
                                                            onChange={e => update(p._id, 'cartoonSize', e.target.value, defaults)}
                                                            placeholder="sz"
                                                            className="w-16 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        />
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300">× 12</span>
                                                    )}
                                                </td>
                                                {/* Sale Price */}
                                                <td className="px-3 py-2 text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        value={r.salePrice}
                                                        onChange={e => update(p._id, 'salePrice', e.target.value, defaults)}
                                                        placeholder="0.00"
                                                        className="w-20 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-right focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                    />
                                                </td>
                                                {/* Pieces */}
                                                <td className="px-3 py-2 text-right hidden sm:table-cell">
                                                    <span className={`font-semibold tabular-nums ${pcs > 0 ? 'text-slate-700' : 'text-slate-300'}`}>
                                                        {pcs > 0 ? pcs.toLocaleString() : '—'}
                                                    </span>
                                                </td>
                                                {/* Amount */}
                                                <td className="px-3 py-2 text-right">
                                                    <span className={`font-semibold tabular-nums ${amount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                        {amount > 0 ? fmt(amount) : '—'}
                                                    </span>
                                                </td>
                                                {/* Free */}
                                                <td className="px-3 py-2 text-center hidden md:table-cell">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={r.free}
                                                        onChange={e => update(p._id, 'free', e.target.value, defaults)}
                                                        placeholder="0"
                                                        className="w-14 rounded border border-slate-200 bg-white px-2 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                    />
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
                                            <td colSpan={9} className="py-10 text-center text-xs text-slate-400">
                                                {products.length === 0
                                                    ? 'No products for this factory.'
                                                    : 'No products match your search.'}
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {/* Totals grid */}
                    <div className="border-t border-slate-100 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
                        {/* Left: discount + payment inputs */}
                        <div className="p-4 space-y-3">
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    Discount (৳)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={discount}
                                    onChange={e => setDiscount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-right font-mono focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                                    Online (৳)
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    value={paidAmountStr}
                                    onChange={e => setPaidAmountStr(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-right font-mono focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                />
                            </div>
                        </div>

                        {/* Right: totals summary */}
                        <div className="p-4 space-y-1.5">
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Items</span>
                                <span className="font-mono font-semibold text-slate-900">{totals.items}</span>
                            </div>
                            {totals.cartons > 0 && (
                                <div className="flex justify-between text-xs text-slate-600">
                                    <span>Cartons</span>
                                    <span className="font-mono">{totals.cartons.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Total Pieces</span>
                                <span className="font-mono">{totals.pieces.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Subtotal</span>
                                <span className="font-mono">{fmt(totals.subtotal)}</span>
                            </div>
                            {totals.disc > 0 && (
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Discount</span>
                                    <span className="font-mono text-danger">− {fmt(totals.disc)}</span>
                                </div>
                            )}
                            {previousDue > 0 && (
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Previous Due</span>
                                    <span className="font-mono text-danger">+ {fmt(previousDue)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1.5">
                                <span>Total</span>
                                <span className="font-mono">{fmt(totals.total)}</span>
                            </div>
                            {totals.balance > 0 && (
                                <div className="flex justify-between text-xs font-semibold text-danger">
                                    <span>Distributor Due</span>
                                    <span className="font-mono">{fmt(totals.balance)}</span>
                                </div>
                            )}
                            {totals.balance < 0 && (
                                <div className="flex justify-between text-xs font-semibold text-blue-600">
                                    <span>Depo Due</span>
                                    <span className="font-mono">{fmt(Math.abs(totals.balance))}</span>
                                </div>
                            )}
                            {totals.balance === 0 && totals.items > 0 && (
                                <div className="flex justify-between text-xs font-semibold text-emerald-600">
                                    <span>Settled</span>
                                    <span className="font-mono">—</span>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex items-center gap-2 pt-3">
                                <button
                                    type="button"
                                    className="flex items-center gap-1.5 rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    <PrinterIcon className="h-3.5 w-3.5" />
                                    Preview
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <DocumentCheckIcon className="h-3.5 w-3.5" />
                                    {isLoading ? 'Processing…' : 'Issue Invoice'}
                                </button>
                            </div>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateSalePage;
