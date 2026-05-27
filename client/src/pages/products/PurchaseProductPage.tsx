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
import { useCreatePurchaseMutation, useGetSupplierBalanceQuery } from '@/services/purchasesApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';

type PurchaseItem = {
    productId: string;
    quantityInput: string;  // dozens or cartoons
    cartoonSize: string;    // pieces per cartoon (Cartoon unit only)
    purchasePrice: string;  // rate per piece
    free: string;           // free pieces
};

const getPieces = (item: PurchaseItem, unit: string): number => {
    const qty = Number(item.quantityInput) || 0;
    if (unit === 'Dozen') return Math.round(qty * 12);
    if (unit === 'Cartoon') {
        const size = Number(item.cartoonSize) || 0;
        return Math.round(qty * size);
    }
    return qty;
};

const PurchaseProductPage = () => {
    const navigate = useNavigate();
    const [createPurchase, { isLoading }] = useCreatePurchaseMutation();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState('');
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Payment
    const [paymentMethod, setPaymentMethod] = useState('');
    const [paidAmountStr, setPaidAmountStr] = useState('');
    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

    const { data: productsData, isLoading: isLoadingProducts, isError: isProductsError } = useGetProductsQuery({
        search: searchTerm,
        limit: 100,
        page: 1,
    });

    const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSuppliersQuery({ limit: 100 });
    const { data: balanceData } = useGetSupplierBalanceQuery(selectedSupplierId, {
        skip: !selectedSupplierId,
    });
    const previousDue = balanceData?.balance ?? 0;

    const products = useMemo(() => productsData?.products ?? [], [productsData?.products]);
    const suppliers = useMemo(() => suppliersData?.suppliers?.filter(s => s.status === 'active') ?? [], [suppliersData?.suppliers]);

    const filteredProducts = useMemo(() => {
        if (!selectedSupplierId) return products;
        return products.filter(p => p.supplierId === selectedSupplierId);
    }, [products, selectedSupplierId]);

    const totalPrice = useMemo(() => {
        return purchaseItems.reduce((sum, item) => {
            const product = products.find(p => p._id === item.productId);
            if (!product) return sum;
            const pieces = getPieces(item, product.unit);
            const rate = Number(item.purchasePrice) || 0;
            return sum + pieces * rate;
        }, 0);
    }, [purchaseItems, products]);

    const handleProductToggle = useCallback((productId: string) => {
        const newSelectedIds = new Set(selectedProductIds);
        if (newSelectedIds.has(productId)) {
            newSelectedIds.delete(productId);
            setPurchaseItems(items => items.filter(item => item.productId !== productId));
        } else {
            newSelectedIds.add(productId);
            const product = products.find(p => p._id === productId);
            if (product) {
                setPurchaseItems(items => [...items, {
                    productId,
                    quantityInput: '',
                    cartoonSize: product.cartoonSize ? String(product.cartoonSize) : '',
                    purchasePrice: product.sellingPrice ? String(product.sellingPrice) : '',
                    free: '',
                }]);
            }
        }
        setSelectedProductIds(newSelectedIds);
    }, [selectedProductIds, products]);

    const handleItemUpdate = useCallback((productId: string, field: keyof PurchaseItem, value: string) => {
        setPurchaseItems(items =>
            items.map(item => item.productId !== productId ? item : { ...item, [field]: value })
        );
        const errorKey = `${productId}-${field}`;
        if (errors[errorKey]) {
            setErrors(prev => { const e = { ...prev }; delete e[errorKey]; return e; });
        }
    }, [errors]);

    const handleRemoveItem = useCallback((productId: string) => {
        setPurchaseItems(items => items.filter(item => item.productId !== productId));
        setSelectedProductIds(prev => { const s = new Set(prev); s.delete(productId); return s; });
    }, []);

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!selectedSupplierId) newErrors.supplier = 'Please select a factory';
        if (purchaseItems.length === 0) newErrors.general = 'Please select at least one product';

        purchaseItems.forEach(item => {
            const product = products.find(p => p._id === item.productId);
            if (!item.quantityInput || Number(item.quantityInput) <= 0) {
                newErrors[`${item.productId}-quantityInput`] = 'Required';
            }
            if (item.purchasePrice === '' || isNaN(Number(item.purchasePrice))) {
                newErrors[`${item.productId}-purchasePrice`] = 'Required';
            }
            if (product?.unit === 'Cartoon' && (!item.cartoonSize || Number(item.cartoonSize) <= 0)) {
                newErrors[`${item.productId}-cartoonSize`] = 'Required';
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
            const selectedSupplier = suppliers.find(s => s._id === selectedSupplierId);
            if (!selectedSupplier) {
                toast.error('Please select a supplier');
                return;
            }

            const purchaseItemsData = purchaseItems.map(item => {
                const product = products.find(p => p._id === item.productId);
                if (!product) throw new Error(`Product not found: ${item.productId}`);

                const pieces = getPieces(item, product.unit);
                const unitPrice = Number(item.purchasePrice);
                const inputQty = Number(item.quantityInput);
                const free = item.free ? Number(item.free) : undefined;
                const cartoonSize = item.cartoonSize ? Number(item.cartoonSize) : undefined;

                return {
                    product: item.productId,
                    productName: product.name,
                    categoryName: product.categoryName,
                    unit: product.unit,
                    cartoonSize: product.unit === 'Cartoon' ? cartoonSize : undefined,
                    inputQty,
                    quantity: pieces,
                    unitPrice,
                    totalPrice: pieces * unitPrice,
                    ...(free !== undefined && !isNaN(free) && { free }),
                };
            });

            const subtotal = purchaseItemsData.reduce((sum, item) => sum + item.totalPrice, 0);
            const paidAmount = paidAmountStr !== '' ? Number(paidAmountStr) : undefined;
            const subTotal = subtotal + previousDue;
            const status = paidAmount === undefined || paidAmount === 0
                ? 'pending'
                : paidAmount >= subTotal
                ? 'completed'
                : 'partial';

            const result = await createPurchase({
                supplier: {
                    _id: selectedSupplier._id,
                    name: selectedSupplier.name,
                    contactPerson: selectedSupplier.contactPerson,
                    phone: selectedSupplier.phone,
                    address: selectedSupplier.address,
                },
                items: purchaseItemsData,
                subtotal,
                totalAmount: subtotal,
                previousDue: previousDue > 0 ? previousDue : undefined,
                ...(paidAmount !== undefined && { paidAmount }),
                ...(paymentMethod && { paymentMethod }),
                ...(paidAmount !== undefined && { paymentDate: new Date(paymentDate).toISOString() }),
                status,
            }).unwrap();

            setSelectedProductIds(new Set());
            setPurchaseItems([]);
            setSearchTerm('');
            setSelectedSupplierId('');
            setPaymentMethod('');
            setPaidAmountStr('');
            setPaymentDate(new Date().toISOString().split('T')[0]);

            toast.success('Purchase completed!', {
                description: `Purchase #${result.purchaseNumber} created with ${purchaseItems.length} product(s)`,
            });
            navigate('/purchases');

        } catch (error: any) {
            toast.error('Purchase failed', {
                description: error?.data?.message || 'Failed to create purchase. Please try again.',
            });
        }
    };

    if (isLoadingProducts) return <Loader fullScreen message="Loading products..." />;
    if (isProductsError) return <ErrorState title="Failed to load products" onRetry={() => window.location.reload()} />;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <button
                    onClick={() => navigate('/products')}
                    className="flex h-9 w-9 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                </button>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Inventory &amp; Orders</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Purchase Product</h1>
                </div>
            </div>

            {/* Factory */}
            <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Factory <span className="text-danger">*</span>
                </label>
                <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                        setSelectedSupplierId(e.target.value);
                        if (errors.supplier) setErrors(prev => { const e = { ...prev }; delete e.supplier; return e; });
                    }}
                    className={`w-full rounded-sm border ${errors.supplier ? 'border-danger' : 'border-slate-200'} bg-white px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors`}
                >
                    <option value="">-- Select Factory --</option>
                    {suppliers.map((s) => (
                        <option key={s._id} value={s._id}>{s.name} - {s.contactPerson}</option>
                    ))}
                </select>
                {errors.supplier && <p className="mt-1.5 text-xs text-danger">{errors.supplier}</p>}
                {isLoadingSuppliers && <p className="mt-1.5 text-xs text-slate-500">Loading factories...</p>}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Product Search */}
                <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                    <label className="block text-xs font-semibold text-slate-700 mb-2">Search Products</label>
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                            placeholder="Search by name, SKU, or category..."
                        />
                    </div>
                    {errors.general && <p className="mt-1 text-[10px] text-danger">{errors.general}</p>}
                </div>

                {/* Select Products Table */}
                <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                    <h3 className="text-xs font-semibold text-slate-700 mb-2">Select Products</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full divide-y divide-slate-200 text-xs">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">S/N</th>
                                    <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Product</th>
                                    <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">SKU</th>
                                    <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Category</th>
                                    <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Unit</th>
                                    <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Stock (pcs)</th>
                                    <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-2 py-3 text-center text-xs text-slate-500">
                                            {selectedSupplierId ? 'No products found for the selected supplier' : 'No products found'}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product, idx) => {
                                        const isSelected = selectedProductIds.has(product._id);
                                        return (
                                            <tr key={product._id} className={isSelected ? 'bg-brand/5' : 'hover:bg-slate-50'}>
                                                <td className="px-2 py-1.5 text-slate-400">{idx + 1}</td>
                                                <td className="px-2 py-1.5">
                                                    <div className="font-medium text-slate-900">{product.name}</div>
                                                </td>
                                                <td className="px-2 py-1.5 text-slate-500">{product.sku || '—'}</td>
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
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Purchase Details Table */}
                {purchaseItems.length > 0 && (
                    <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h3 className="text-xs font-semibold text-slate-700">Purchase Details</h3>
                            <span className="text-[10px] text-slate-500">{purchaseItems.length} product{purchaseItems.length !== 1 ? 's' : ''} selected</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">S/N</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Product</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Category</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Unit</th>
                                        <th className="px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-700">Rate</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Ctn Size</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Qty</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Pcs</th>
                                        <th className="px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-700">Amount</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Free</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {purchaseItems.map((item, idx) => {
                                        const product = products.find(p => p._id === item.productId);
                                        if (!product) return null;

                                        const pieces = getPieces(item, product.unit);
                                        const rate = Number(item.purchasePrice) || 0;
                                        const amount = pieces * rate;
                                        const isCartoon = product.unit === 'Cartoon';

                                        return (
                                            <tr key={item.productId} className="hover:bg-slate-50/70">
                                                <td className="px-2 py-2 text-slate-400">{idx + 1}</td>

                                                {/* Product */}
                                                <td className="px-2 py-2">
                                                    <div className="font-medium text-slate-900 whitespace-nowrap">{product.name}</div>
                                                    {product.sku && <div className="text-[10px] text-slate-400">SKU: {product.sku}</div>}
                                                </td>

                                                {/* Category */}
                                                <td className="px-2 py-2 text-slate-600 whitespace-nowrap">
                                                    {product.categoryName || '—'}
                                                </td>

                                                {/* Unit */}
                                                <td className="px-2 py-2 text-center">
                                                    <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[9px] font-semibold ${product.unit === 'Dozen' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                        {product.unit}
                                                    </span>
                                                </td>

                                                {/* Rate (per piece) */}
                                                <td className="px-2 py-2 text-right whitespace-nowrap">
                                                    <div className="relative inline-block">
                                                        <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-400 text-[9px]">৳</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.purchasePrice}
                                                            onChange={(e) => handleItemUpdate(item.productId, 'purchasePrice', e.target.value)}
                                                            className={`w-20 rounded border ${errors[`${item.productId}-purchasePrice`] ? 'border-danger' : 'border-slate-200'} bg-white pl-5 pr-1.5 py-1 text-xs text-right focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20`}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    {errors[`${item.productId}-purchasePrice`] && (
                                                        <p className="text-[9px] text-danger">{errors[`${item.productId}-purchasePrice`]}</p>
                                                    )}
                                                </td>

                                                {/* Cartoon Size */}
                                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                                    {isCartoon ? (
                                                        <>
                                                            <input
                                                                type="number"
                                                                min="1"
                                                                step="1"
                                                                value={item.cartoonSize}
                                                                onChange={(e) => handleItemUpdate(item.productId, 'cartoonSize', e.target.value)}
                                                                className={`w-16 rounded border ${errors[`${item.productId}-cartoonSize`] ? 'border-danger' : 'border-slate-200'} bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20`}
                                                                placeholder="50"
                                                            />
                                                            {errors[`${item.productId}-cartoonSize`] && (
                                                                <p className="text-[9px] text-danger">{errors[`${item.productId}-cartoonSize`]}</p>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-slate-300 text-[10px]">—</span>
                                                    )}
                                                </td>

                                                {/* Qty (in dozens or cartoons) */}
                                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={item.quantityInput}
                                                        onChange={(e) => handleItemUpdate(item.productId, 'quantityInput', e.target.value)}
                                                        disabled={isCartoon && !item.cartoonSize}
                                                        className={`w-16 rounded border ${errors[`${item.productId}-quantityInput`] ? 'border-danger' : 'border-slate-200'} bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20 disabled:opacity-50 disabled:cursor-not-allowed`}
                                                        placeholder={isCartoon ? 'Ctn' : 'Doz'}
                                                    />
                                                    {errors[`${item.productId}-quantityInput`] && (
                                                        <p className="text-[9px] text-danger">{errors[`${item.productId}-quantityInput`]}</p>
                                                    )}
                                                    {pieces > 0 && (
                                                        <p className="text-[9px] text-emerald-600 mt-0.5">{pieces} pcs</p>
                                                    )}
                                                </td>

                                                {/* Pcs (auto-calculated) */}
                                                <td className="px-2 py-2 text-center">
                                                    <span className={`text-xs font-semibold ${pieces > 0 ? 'text-emerald-700' : 'text-slate-300'}`}>
                                                        {pieces > 0 ? pieces.toLocaleString() : '—'}
                                                    </span>
                                                </td>

                                                {/* Amount */}
                                                <td className="px-2 py-2 text-right whitespace-nowrap">
                                                    <span className={`text-xs font-bold ${amount > 0 ? 'text-slate-900' : 'text-slate-300'}`}>
                                                        {amount > 0 ? `৳${amount.toFixed(2)}` : '—'}
                                                    </span>
                                                </td>

                                                {/* Free */}
                                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={item.free}
                                                        onChange={(e) => handleItemUpdate(item.productId, 'free', e.target.value)}
                                                        className="w-14 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        placeholder="0"
                                                    />
                                                </td>

                                                {/* Action */}
                                                <td className="px-2 py-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.productId)}
                                                        className="inline-flex items-center p-1 rounded text-danger hover:bg-red-50 transition"
                                                    >
                                                        <TrashIcon className="h-3.5 w-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-brand/5 border-t border-slate-200">
                                    <tr>
                                        <td colSpan={8} className="px-2 py-2 text-right text-[10px] font-semibold text-slate-700">
                                            Total Purchase Amount:
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                            <span className="text-sm font-bold text-brand">৳{totalPrice.toFixed(2)}</span>
                                        </td>
                                        <td colSpan={2}></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Payment Section */}
                {purchaseItems.length > 0 && (
                    <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                        <h3 className="text-xs font-semibold text-slate-700 mb-3">Payment</h3>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Payment Method</label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                >
                                    <option value="">-- Select --</option>
                                    <option value="cash">Cash</option>
                                    <option value="online">Online</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="cheque">Cheque</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Amount Paid</label>
                                <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={paidAmountStr}
                                    onChange={(e) => setPaidAmountStr(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Payment Date</label>
                                <input
                                    type="date"
                                    value={paymentDate}
                                    onChange={(e) => setPaymentDate(e.target.value)}
                                    className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                />
                            </div>
                        </div>
                        {/* Summary */}
                        <div className="mt-3 space-y-1 border-t border-slate-100 pt-3 text-xs">
                            <div className="flex justify-between">
                                <span className="text-slate-600">Total Taka</span>
                                <span className="font-semibold text-slate-900">৳{totalPrice.toFixed(2)}</span>
                            </div>
                            {previousDue > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Depo Due</span>
                                    <span className="font-semibold text-danger">৳{previousDue.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t border-slate-200 pt-1">
                                <span className="font-semibold text-slate-700">Sub Total</span>
                                <span className="font-bold text-slate-900">৳{(totalPrice + previousDue).toFixed(2)}</span>
                            </div>
                            {paidAmountStr !== '' && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Paid</span>
                                    <span className="font-semibold text-emerald-700">৳{Number(paidAmountStr).toFixed(2)}</span>
                                </div>
                            )}
                            {paidAmountStr !== '' && (
                                <div className="flex justify-between">
                                    <span className="text-slate-600">Adjust</span>
                                    <span className={`font-semibold ${(totalPrice + previousDue - Number(paidAmountStr)) > 0 ? 'text-danger' : 'text-emerald-700'}`}>
                                        ৳{(totalPrice + previousDue - Number(paidAmountStr)).toFixed(2)}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Actions */}
                {purchaseItems.length > 0 && (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            type="button"
                            onClick={() => navigate('/products')}
                            className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="rounded-sm bg-brand px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Processing...' : 'Complete Purchase'}
                        </button>
                    </div>
                )}
            </form>
        </div>
    );
};

export default PurchaseProductPage;
