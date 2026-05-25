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
import { useGetExpensesQuery } from '@/services/expensesApi';
import { useCreatePurchaseMutation } from '@/services/purchasesApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';

type PurchaseItem = {
    productId: string;
    quantity: string;
    purchasePrice: string;
    markupPercent: string;
    sellingPrice: string;
    minStockLevel: string;
    supplierId: string;
};

const PurchaseProductPage = () => {
    const navigate = useNavigate();
    const [createPurchase, { isLoading }] = useCreatePurchaseMutation();

    const [searchTerm, setSearchTerm] = useState('');
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Fetch products for selection
    const { data: productsData, isLoading: isLoadingProducts, isError: isProductsError } = useGetProductsQuery({
        search: searchTerm,
        limit: 100,
        page: 1,
    });

    // Fetch suppliers for selection
    const { data: suppliersData, isLoading: isLoadingSuppliers } = useGetSuppliersQuery({
        limit: 100,
    });

    // Fetch expenses to get supplier for products
    const { data: expensesData } = useGetExpensesQuery({
        category: 'product_purchase',
        limit: 10000, // Fetch all to find suppliers
    });

    const products = useMemo(() => productsData?.products ?? [], [productsData?.products]);
    const suppliers = useMemo(() => suppliersData?.suppliers?.filter(s => s.status === 'active') ?? [], [suppliersData?.suppliers]);
    const expenses = useMemo(() => expensesData?.result ?? [], [expensesData]);

    // Helper function to get supplier ID for a product from its purchase history
    const getProductSupplierId = useCallback((productId: string): string | undefined => {
        // Find the most recent expense for this product
        const productExpenses = expenses
            .filter(exp =>
                exp.referenceModel === 'Product' &&
                (typeof exp.referenceId === 'string' ? exp.referenceId : exp.referenceId?._id) === productId
            )
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        if (productExpenses.length > 0) {
            const expense = productExpenses[0];
            if (expense.supplier) {
                return typeof expense.supplier === 'object' ? expense.supplier._id : expense.supplier;
            }
        }
        return undefined;
    }, [expenses]);

    // Filter products by selected supplier
    const filteredProducts = useMemo(() => {
        if (!selectedSupplierId) {
            // If no supplier is selected, show all products
            return products;
        }

        // Filter products that belong to the selected supplier
        return products.filter((product) => {
            // Check if product has supplierId matching the selected supplier
            if (product.supplierId === selectedSupplierId) {
                return true;
            }

            // If product doesn't have supplierId, check purchase history
            const historicalSupplierId = getProductSupplierId(product._id);
            if (historicalSupplierId === selectedSupplierId) {
                return true;
            }

            return false;
        });
    }, [products, selectedSupplierId, getProductSupplierId]);

    // Calculate total price for all items
    const totalPrice = useMemo(() => {
        return purchaseItems.reduce((total, item) => {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.purchasePrice) || 0;
            return total + (qty * price);
        }, 0);
    }, [purchaseItems]);

    const handleProductToggle = (productId: string) => {
        const newSelectedIds = new Set(selectedProductIds);
        if (newSelectedIds.has(productId)) {
            // Remove product
            newSelectedIds.delete(productId);
            setPurchaseItems(items => items.filter(item => item.productId !== productId));
        } else {
            // Add product
            newSelectedIds.add(productId);
            const product = products.find(p => p._id === productId);
            if (product) {
                // Get supplier from product's purchase history, or use selected supplier from top dropdown, or empty
                const productSupplierId = getProductSupplierId(productId);
                const finalSupplierId = productSupplierId || selectedSupplierId || '';

                setPurchaseItems(items => [...items, {
                    productId,
                    quantity: '',
                    purchasePrice: product.purchasePrice?.toString() || '',
                    markupPercent: '',
                    sellingPrice: '',
                    minStockLevel: product.minStockLevel?.toString() || '',
                    supplierId: finalSupplierId,
                }]);
            }
        }
        setSelectedProductIds(newSelectedIds);
    };

    const calculateSellingPrice = (purchasePrice: number, markupPercent: number): number => {
        if (!purchasePrice || purchasePrice <= 0) return 0;
        if (!markupPercent || markupPercent < 0) return purchasePrice;
        return purchasePrice * (1 + markupPercent / 100);
    };

    const calculateMarkupPercent = (purchasePrice: number, sellingPrice: number): number => {
        if (!purchasePrice || purchasePrice <= 0) return 0;
        if (!sellingPrice || sellingPrice <= 0) return 0;
        return ((sellingPrice - purchasePrice) / purchasePrice) * 100;
    };

    const handleItemUpdate = (productId: string, field: keyof PurchaseItem, value: string) => {
        setPurchaseItems(items =>
            items.map(item => {
                if (item.productId !== productId) return item;

                const updatedItem = { ...item, [field]: value };

                // Auto-calculate selling price when purchase price or markup percent changes
                if (field === 'purchasePrice' || field === 'markupPercent') {
                    const purchasePrice = Number(updatedItem.purchasePrice) || 0;
                    const markupPercent = Number(updatedItem.markupPercent) || 0;

                    // Only auto-calculate if we have both purchase price and markup percent > 0
                    if (purchasePrice > 0 && markupPercent > 0) {
                        const calculatedSellingPrice = calculateSellingPrice(purchasePrice, markupPercent);
                        updatedItem.sellingPrice = calculatedSellingPrice > 0 ? calculatedSellingPrice.toFixed(2) : '';
                    } else if (field === 'markupPercent' && markupPercent === 0) {
                        // If markup percent is cleared, clear selling price (unless manually set)
                        // Keep it empty for default behavior
                        if (!updatedItem.sellingPrice || updatedItem.sellingPrice === item.sellingPrice) {
                            updatedItem.sellingPrice = '';
                        }
                    }
                }

                // Auto-calculate markup percent when selling price changes
                if (field === 'sellingPrice') {
                    const purchasePrice = Number(updatedItem.purchasePrice) || 0;
                    const sellingPrice = Number(updatedItem.sellingPrice) || 0;

                    // Only auto-calculate if we have both prices > 0
                    if (purchasePrice > 0 && sellingPrice > 0) {
                        const calculatedMarkupPercent = calculateMarkupPercent(purchasePrice, sellingPrice);
                        updatedItem.markupPercent = calculatedMarkupPercent >= 0 ? calculatedMarkupPercent.toFixed(2) : '';
                    } else if (sellingPrice === 0) {
                        // If selling price is cleared, clear markup percent
                        updatedItem.markupPercent = '';
                    }
                }

                return updatedItem;
            })
        );
        // Clear error for this field
        const errorKey = `${productId}-${field}`;
        if (errors[errorKey]) {
            setErrors(prev => {
                const newErrors = { ...prev };
                delete newErrors[errorKey];
                return newErrors;
            });
        }
    };

    const handleRemoveItem = (productId: string) => {
        setPurchaseItems(items => items.filter(item => item.productId !== productId));
        const newSelectedIds = new Set(selectedProductIds);
        newSelectedIds.delete(productId);
        setSelectedProductIds(newSelectedIds);
    };

    const validate = (): boolean => {
        const newErrors: Record<string, string> = {};

        // Check if we have a top-level supplier OR at least one item with a supplier
        const hasTopLevelSupplier = !!selectedSupplierId;
        const hasItemSuppliers = purchaseItems.some(item => item.supplierId);

        if (!hasTopLevelSupplier && !hasItemSuppliers) {
            newErrors.supplier = 'Please select a supplier';
        }

        if (purchaseItems.length === 0) {
            newErrors.general = 'Please select at least one product';
        }

        purchaseItems.forEach(item => {
            if (!item.quantity || Number(item.quantity) <= 0) {
                newErrors[`${item.productId}-quantity`] = 'Valid quantity is required';
            }
            if (!item.purchasePrice || Number(item.purchasePrice) <= 0) {
                newErrors[`${item.productId}-purchasePrice`] = 'Valid purchase price is required';
            }
        });

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        console.log('handleSubmit called', { selectedSupplierId, purchaseItems });

        if (!validate()) {
            toast.error('Please fix validation errors', {
                description: 'Please check all fields and try again.',
            });
            return;
        }

        try {
            // Get selected supplier - use top-level supplier or first item's supplier
            let supplierIdToUse = selectedSupplierId;
            if (!supplierIdToUse && purchaseItems.length > 0) {
                // Use the first item's supplier if no top-level supplier is selected
                supplierIdToUse = purchaseItems[0].supplierId;
            }

            const selectedSupplier = suppliers.find(s => s._id === supplierIdToUse);
            if (!selectedSupplier) {
                toast.error('Please select a supplier for the purchase');
                return;
            }


            // Format purchase items
            const purchaseItemsData = purchaseItems.map(item => {
                const product = products.find(p => p._id === item.productId);
                if (!product) throw new Error(`Product not found: ${item.productId}`);

                const quantity = Number(item.quantity);
                const unitPrice = Number(item.purchasePrice);
                const markupPercent = item.markupPercent !== '' && item.markupPercent !== undefined ? Number(item.markupPercent) : undefined;
                const sellingPrice = item.sellingPrice !== '' && item.sellingPrice !== undefined ? Number(item.sellingPrice) : undefined;
                const minStockLevel = item.minStockLevel !== '' && item.minStockLevel !== undefined ? Number(item.minStockLevel) : undefined;

                return {
                    product: item.productId,
                    productName: product.name,
                    quantity: quantity,
                    unitPrice: unitPrice,
                    totalPrice: quantity * unitPrice,
                    ...(markupPercent !== undefined && !isNaN(markupPercent) && { markupPercent }),
                    ...(sellingPrice !== undefined && !isNaN(sellingPrice) && { sellingPrice }),
                    ...(minStockLevel !== undefined && !isNaN(minStockLevel) && { minStockLevel }),
                };
            });

            // Calculate totals
            const subtotal = purchaseItemsData.reduce((sum, item) => sum + item.totalPrice, 0);

            // Create purchase
            const purchaseData = {
                supplier: {
                    _id: selectedSupplier._id,
                    name: selectedSupplier.name,
                    contactPerson: selectedSupplier.contactPerson,
                    phone: selectedSupplier.phone,
                    address: selectedSupplier.address,
                },
                items: purchaseItemsData,
                subtotal: subtotal,
                totalAmount: subtotal,
            };

            const result = await createPurchase(purchaseData).unwrap();

            // Reset form
            setSelectedProductIds(new Set());
            setPurchaseItems([]);
            setSearchTerm('');
            setSelectedSupplierId('');

            // Show success notification
            toast.success('Purchase completed successfully!', {
                description: `Purchase #${result.purchaseNumber} created with ${purchaseItems.length} product(s)`,
            });

            // Navigate to purchases list
            navigate('/purchases');

        } catch (error: any) {
            console.error('Failed to create purchase:', error);
            const errorMessage = error?.data?.message || 'Failed to create purchase. Please try again.';
            toast.error('Purchase failed', {
                description: errorMessage,
            });
        }
    };

    if (isLoadingProducts) {
        return <Loader fullScreen message="Loading products..." />;
    }

    if (isProductsError) {
        return <ErrorState title="Failed to load products" onRetry={() => window.location.reload()} />;
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
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
            </div>

            {/* Supplier Selection - At the very top before search */}
            <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Select Supplier <span className="text-danger">*</span>
                </label>
                <select
                    value={selectedSupplierId}
                    onChange={(e) => {
                        setSelectedSupplierId(e.target.value);
                        if (errors.supplier) {
                            setErrors(prev => {
                                const newErrors = { ...prev };
                                delete newErrors.supplier;
                                return newErrors;
                            });
                        }
                    }}
                    className={`w-full rounded-sm border ${errors.supplier ? 'border-danger' : 'border-slate-200'
                        } bg-white px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors`}
                >
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map((supplier) => (
                        <option key={supplier._id} value={supplier._id}>
                            {supplier.name} - {supplier.contactPerson}
                        </option>
                    ))}
                </select>
                {errors.supplier && (
                    <p className="mt-1.5 text-xs text-danger">{errors.supplier}</p>
                )}
                {isLoadingSuppliers && (
                    <p className="mt-1.5 text-xs text-slate-500">Loading suppliers...</p>
                )}
            </div>

            {/* Form */}
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
                    {errors.general && (
                        <p className="mt-1 text-[10px] text-danger">{errors.general}</p>
                    )}
                </div>

                {/* Products Table */}
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
                                    <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Stock</th>
                                    <th className="px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-700">Purchase Price</th>
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
                                                <td className="px-2 py-1.5 text-slate-400 text-xs">{idx + 1}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">
                                                    <div className="text-xs font-medium text-slate-900">{product.name}</div>
                                                    <div className="text-[10px] text-slate-500">Unit: {product.unit}</div>
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">
                                                    <div className="text-xs text-slate-600">{product.sku || 'N/A'}</div>
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">
                                                    <div className="text-xs text-slate-600">{product.categoryName || 'N/A'}</div>
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                                                    <div className="text-xs font-semibold text-slate-900">{product.stockQuantity}</div>
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-right">
                                                    <div className="text-xs text-slate-900">৳{product.purchasePrice}</div>
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleProductToggle(product._id)}
                                                        className={`inline-flex items-center px-2 py-1 rounded text-[9px] font-semibold transition ${isSelected
                                                            ? 'text-danger bg-red-50 hover:bg-red-100'
                                                            : 'text-white bg-brand hover:bg-brand-dark'
                                                            }`}
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

                {/* Purchase Items Table */}
                {purchaseItems.length > 0 && (
                    <div className="rounded-sm border border-slate-200/60 bg-white p-3 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-semibold text-slate-700">Purchase Details</h3>
                            <span className="text-[10px] text-slate-500">
                                {purchaseItems.length} product{purchaseItems.length !== 1 ? 's' : ''} selected
                            </span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full divide-y divide-slate-200 text-xs">
                                <thead className="bg-slate-50">
                                    <tr>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">S/N</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Product</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Stock</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Qty</th>
                                        <th className="px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-700">Purchase</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Markup %</th>
                                        <th className="px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-700">Selling</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Min</th>
                                        <th className="px-2 py-1.5 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-700">Supplier</th>
                                        <th className="px-2 py-1.5 text-right text-[9px] font-semibold uppercase tracking-wider text-slate-700">Subtotal</th>
                                        <th className="px-2 py-1.5 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 bg-white">
                                    {purchaseItems.map((item, idx) => {
                                        const product = products.find(p => p._id === item.productId);
                                        if (!product) return null;
                                        const itemTotal = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
                                        const newStock = product.stockQuantity + (Number(item.quantity) || 0);
                                        const selectedSupplier = suppliers.find(s => s._id === item.supplierId);

                                        return (
                                            <tr key={item.productId} className="hover:bg-slate-50">
                                                <td className="px-2 py-1.5 text-slate-400 text-xs">{idx + 1}</td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">
                                                    <div className="text-xs font-medium text-slate-900">{product.name}</div>
                                                    {product.sku && (
                                                        <div className="text-[10px] text-slate-500">SKU: {product.sku}</div>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                                                    <div className="text-xs text-slate-600">{product.stockQuantity} {product.unit}</div>
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        step="1"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemUpdate(item.productId, 'quantity', e.target.value)}
                                                        className={`w-16 rounded border ${errors[`${item.productId}-quantity`] ? 'border-danger' : 'border-slate-200'
                                                            } bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20`}
                                                        placeholder="1"
                                                    />
                                                    {errors[`${item.productId}-quantity`] && (
                                                        <p className="text-[9px] text-danger mt-0.5">{errors[`${item.productId}-quantity`]}</p>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-right">
                                                    <div className="relative inline-block">
                                                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 text-[9px]">৳</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.purchasePrice}
                                                            onChange={(e) => handleItemUpdate(item.productId, 'purchasePrice', e.target.value)}
                                                            className={`w-20 rounded border ${errors[`${item.productId}-purchasePrice`] ? 'border-danger' : 'border-slate-200'
                                                                } bg-white pl-5 pr-1.5 py-1 text-xs text-right focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20`}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    {errors[`${item.productId}-purchasePrice`] && (
                                                        <p className="text-[9px] text-danger mt-0.5">{errors[`${item.productId}-purchasePrice`]}</p>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                                                    <div className="relative inline-block">
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.markupPercent}
                                                            onChange={(e) => handleItemUpdate(item.productId, 'markupPercent', e.target.value)}
                                                            className="w-16 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                            placeholder="0%"
                                                        />
                                                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-500 text-[9px] pointer-events-none">%</span>
                                                    </div>
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-right">
                                                    <div className="relative inline-block">
                                                        <span className="absolute left-1 top-1/2 -translate-y-1/2 text-slate-500 text-[9px]">৳</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={item.sellingPrice}
                                                            onChange={(e) => handleItemUpdate(item.productId, 'sellingPrice', e.target.value)}
                                                            className={`w-20 rounded border ${errors[`${item.productId}-sellingPrice`] ? 'border-danger' : 'border-slate-200'
                                                                } bg-white pl-5 pr-1.5 py-1 text-xs text-right focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20`}
                                                            placeholder="0.00"
                                                        />
                                                    </div>
                                                    {errors[`${item.productId}-sellingPrice`] && (
                                                        <p className="text-[9px] text-danger mt-0.5">{errors[`${item.productId}-sellingPrice`]}</p>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="1"
                                                        value={item.minStockLevel}
                                                        onChange={(e) => handleItemUpdate(item.productId, 'minStockLevel', e.target.value)}
                                                        className="w-16 rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-center focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        placeholder="10"
                                                    />
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap">
                                                    <div className="text-xs font-medium text-slate-900 mb-1">
                                                        {selectedSupplier ? selectedSupplier.name : '-- Not Selected --'}
                                                    </div>
                                                    <select
                                                        value={item.supplierId}
                                                        onChange={(e) => {
                                                            handleItemUpdate(item.productId, 'supplierId', e.target.value);
                                                            const errorKey = `${item.productId}-supplierId`;
                                                            if (errors[errorKey]) {
                                                                setErrors(prev => {
                                                                    const newErrors = { ...prev };
                                                                    delete newErrors[errorKey];
                                                                    return newErrors;
                                                                });
                                                            }
                                                        }}
                                                        className={`w-full min-w-[120px] rounded border ${errors[`${item.productId}-supplierId`] ? 'border-danger' : 'border-slate-200'
                                                            } bg-white px-1.5 py-1 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20`}
                                                    >
                                                        <option value="">-- Select --</option>
                                                        {suppliers.map((supplier) => (
                                                            <option key={supplier._id} value={supplier._id}>
                                                                {supplier.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    {errors[`${item.productId}-supplierId`] && (
                                                        <p className="text-[9px] text-danger mt-0.5">{errors[`${item.productId}-supplierId`]}</p>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-right">
                                                    <div className="text-xs font-semibold text-slate-900">
                                                        ৳{itemTotal.toFixed(2)}
                                                    </div>
                                                    {item.quantity && Number(item.quantity) > 0 && (
                                                        <div className="text-[10px] text-slate-500">
                                                            New: {newStock} {product.unit}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-2 py-1.5 whitespace-nowrap text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(item.productId)}
                                                        className="inline-flex items-center px-1.5 py-1 rounded text-[9px] text-danger hover:bg-red-50 transition"
                                                    >
                                                        <TrashIcon className="h-3 w-3" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                                <tfoot className="bg-brand/5">
                                    <tr>
                                        <td colSpan={8} className="px-2 py-1.5 text-right text-[9px] font-semibold text-slate-900">
                                            Total Purchase Amount:
                                        </td>
                                        <td className="px-2 py-1.5 text-right">
                                            <div className="text-xs font-bold text-brand">৳{totalPrice.toFixed(2)}</div>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                )}

                {/* Action Buttons */}
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
                            disabled={isLoading || purchaseItems.length === 0}
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

