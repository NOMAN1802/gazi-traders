/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    PrinterIcon,
    ShoppingCartIcon,
    MagnifyingGlassIcon,
    UserIcon,
    XMarkIcon,
    ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useGetProductsQuery } from '@/services/productsApi';
import { useGetCategoriesQuery } from '@/services/categoriesApi';
import { useGetExpensesQuery } from '@/services/expensesApi';
import { useCreateOrderMutation } from '@/services/ordersApi';
import { useGetCustomersQuery, type Customer } from '@/services/customersApi';

type OrderItem = {
    category: string;
    product: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
};


const CreateSalePage = () => {
    const navigate = useNavigate();
    const { data: productsData } = useGetProductsQuery({ limit: 1000 });
    const { data: categoriesData } = useGetCategoriesQuery({ limit: 1000 });
    const { data: expensesData } = useGetExpensesQuery({
        category: 'product_purchase',
        limit: 10000, // Fetch all to find suppliers
    });
    const [createOrder, { isLoading }] = useCreateOrderMutation();
    const { data: customersData } = useGetCustomersQuery({ limit: 1000 });

    const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerDropdownOpen, setCustomerDropdownOpen] = useState(false);
    const customerDropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (customerDropdownRef.current && !customerDropdownRef.current.contains(e.target as Node)) {
                setCustomerDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const allCustomers = useMemo(() => customersData?.customers ?? [], [customersData]);

    const filteredCustomers = useMemo(() => {
        if (!customerSearch.trim()) return allCustomers;
        const q = customerSearch.toLowerCase();
        return allCustomers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.email?.toLowerCase().includes(q)
        );
    }, [allCustomers, customerSearch]);

    const handleSelectCustomer = (c: Customer) => {
        setSelectedCustomer(c);
        setCustomerSearch('');
        setCustomerDropdownOpen(false);
    };

    const handleClearCustomer = () => {
        setSelectedCustomer(null);
        setCustomerSearch('');
    };


    const [items, setItems] = useState<OrderItem[]>([
        { category: '', product: '', productName: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
    ]);

    const [discountAmount, setDiscountAmount] = useState(0);
    const [taxPercent, setTaxPercent] = useState(0);
    const [additionalCharges, setAdditionalCharges] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [productSearch, setProductSearch] = useState('');

    const products = useMemo(() => productsData?.products ?? [], [productsData]);
    const categories = useMemo(() => categoriesData?.categories ?? [], [categoriesData]);
    const expenses = useMemo(() => expensesData?.result ?? [], [expensesData]);

    // Helper function to get supplier name for a product from its purchase history
    const getProductSupplierName = useCallback((productId: string): string | undefined => {
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
                return typeof expense.supplier === 'object' ? expense.supplier.name : undefined;
            }
        }
        return undefined;
    }, [expenses]);

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + item.totalPrice, 0);
    }, [items]);

    const taxAmount = useMemo(() => {
        return (subtotal * taxPercent) / 100;
    }, [subtotal, taxPercent]);

    const totalAmount = useMemo(() => {
        return subtotal - discountAmount + taxAmount - additionalCharges;
    }, [subtotal, discountAmount, taxAmount, additionalCharges]);

    const addItem = () => {
        setItems([
            ...items,
            { category: '', product: '', productName: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
        ]);
    };

    const removeItem = (index: number) => {
        if (items.length > 1) {
            setItems(items.filter((_, i) => i !== index));
        }
    };

    const updateItem = (index: number, field: keyof OrderItem, value: any) => {
        const newItems = [...items];
        const item = newItems[index];

        if (field === 'category') {
            item.category = value;
            // Reset product when category changes
            item.product = '';
            item.productName = '';
            item.unitPrice = 0;
            item.totalPrice = 0;
        } else if (field === 'product') {
            // Check if this product is already selected in another row
            const isDuplicate = newItems.some((existingItem, idx) => 
                idx !== index && existingItem.product === value
            );
            
            if (isDuplicate) {
                const selectedProduct = products.find((p) => p._id === value);
                toast.error(`${selectedProduct?.name || 'This product'} is already added to this order`);
                return;
            }
            
            const selectedProduct = products.find((p) => p._id === value);
            if (selectedProduct) {
                item.product = value;
                item.productName = selectedProduct.name;
                item.unitPrice = selectedProduct.sellingPrice;
                item.totalPrice = selectedProduct.sellingPrice * item.quantity;
            }
        } else if (field === 'quantity') {
            item.quantity = Number(value);
            item.totalPrice = item.unitPrice * item.quantity;
        } else if (field === 'unitPrice') {
            item.unitPrice = Number(value);
            item.totalPrice = item.unitPrice * item.quantity;
        }

        setItems(newItems);
    };

    const getFilteredProducts = (categoryId: string, currentProductId?: string) => {
        if (!categoryId) return [];
        const category = categories.find((c) => c._id === categoryId);
        if (!category) return [];
        const selectedIds = items.map(item => item.product).filter(Boolean);
        return products.filter((p) => {
            // Include the current product being edited
            if (currentProductId && p._id === currentProductId) return true;
            // Exclude products that are already selected in other rows
            if (selectedIds.includes(p._id)) return false;
            // Filter by category
            return p.categoryName === category.name;
        });
    };

    // Filter products for search dropdown (exclude already selected products)
    const searchableProducts = useMemo(() => {
        if (!productSearch.trim()) return [];
        const query = productSearch.toLowerCase().trim();
        const selectedIds = items.map(item => item.product).filter(Boolean);
        const selectedIdsSet = new Set(selectedIds);
        return products.filter((product) => {
            // Exclude already selected products
            if (selectedIdsSet.has(product._id)) return false;
            
            const nameMatch = product.name?.toLowerCase().includes(query);
            const skuMatch = product.sku?.toLowerCase().includes(query);
            const categoryMatch = product.categoryName?.toLowerCase().includes(query);
            const supplierName = getProductSupplierName(product._id);
            const supplierMatch = supplierName?.toLowerCase().includes(query);
            return nameMatch || skuMatch || categoryMatch || supplierMatch;
        }).slice(0, 10); // Limit to 10 results for performance
    }, [items, products, productSearch, getProductSupplierName]);

    // Handle adding product from search
    const handleProductSelect = (product: any) => {
        if (!product || !product._id) return;

        // Find category for this product
        const productCategory = categories.find((c) => c.name === product.categoryName);
        const categoryId = productCategory?._id || '';

        // Check if product is already in items
        const existingItemIndex = items.findIndex((item) => item.product === product._id);
        
        if (existingItemIndex !== -1) {
            // Product already exists - show error
            toast.error(`${product.name} is already added to this order`);
            setProductSearch('');
            return;
        }

        // Add new item with product
        const newItem: OrderItem = {
            category: categoryId,
            product: product._id,
            productName: product.name,
            quantity: 1,
            unitPrice: product.sellingPrice || 0,
            totalPrice: product.sellingPrice || 0,
        };
        setItems([...items, newItem]);
        toast.success(`Added ${product.name} to order`);

        // Clear search
        setProductSearch('');
    };

    const handleSubmit = async (print: boolean = false) => {
        try {
            setErrors({});

            // Validate that we have at least one item
            const validItems = items
                .filter((item) => item.product && item.quantity > 0)
                .map(({ category, ...item }) => item);

            if (validItems.length === 0) {
                setErrors({ items: 'Please add at least one product to the order' });
                toast.error('Please add at least one product to the order');
                return;
            }

            // Build order data with proper validation
            const orderData: any = {
                customer: {
                    name: selectedCustomer?.name || 'Walk-in Customer',
                    ...(selectedCustomer?.phone && { phone: selectedCustomer.phone }),
                    ...(selectedCustomer?.email && { email: selectedCustomer.email }),
                    ...(selectedCustomer?.address && { address: selectedCustomer.address }),
                },
                items: validItems,
                subtotal: Number(subtotal),
                totalAmount: Number(totalAmount),
            };

            // Only add optional numeric fields if they are greater than 0
            if (discountAmount > 0) {
                orderData.discount = Number(discountAmount);
            }

            if (taxAmount > 0) {
                orderData.tax = Number(taxAmount);
            }

            if (additionalCharges > 0) {
                orderData.additionalCharges = Number(additionalCharges);
            }

            // Only add payment method if not empty
            if (paymentMethod && paymentMethod.trim()) {
                orderData.paymentMethod = paymentMethod.trim();
            }

            // Only add notes if not empty
            if (notes && notes.trim()) {
                orderData.notes = notes.trim();
            }

            const result = await createOrder(orderData).unwrap();

            if (print) {
                // Open invoice in new window for printing
                window.open(`/invoices/${result._id}/print`, '_blank');
            }

            navigate('/invoices');
        } catch (error: any) {
            console.error('Failed to create order:', error);

            // Extract error details
            let errorMessage = 'Failed to create order. Please check all fields and try again.';

            if (error?.data?.message) {
                errorMessage = error.data.message;
            } else if (error?.data?.errorSources && Array.isArray(error.data.errorSources)) {
                const messages = error.data.errorSources.map((e: any) => e.message).join(', ');
                errorMessage = messages;
            }

            toast.error(errorMessage);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/invoices')}
                        className="flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Point of Sale</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create Sale</h1>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Form - 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Selection */}
                    <section className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-900 mb-3">Customer</h2>

                        <div ref={customerDropdownRef} className="relative">
                            {/* Trigger */}
                            {selectedCustomer ? (
                                <div className="flex items-center justify-between rounded-sm border border-brand/40 bg-brand/5 px-3 py-2.5">
                                    <div className="flex items-center gap-2.5">
                                        <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-brand/10">
                                            <UserIcon className="h-4 w-4 text-brand" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-semibold text-slate-900">{selectedCustomer.name}</p>
                                            <p className="text-[10px] text-slate-500">
                                                {[selectedCustomer.phone, selectedCustomer.email].filter(Boolean).join(' · ') || 'No contact info'}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleClearCustomer}
                                        className="flex h-6 w-6 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                                    >
                                        <XMarkIcon className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <button
                                    type="button"
                                    onClick={() => setCustomerDropdownOpen((o) => !o)}
                                    className="flex w-full items-center justify-between rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-left transition-all hover:border-brand/40 hover:bg-white focus:outline-none"
                                >
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <UserIcon className="h-4 w-4" />
                                        <span className="text-xs">Select customer (or leave for Walk-in)</span>
                                    </div>
                                    <ChevronDownIcon className={`h-4 w-4 text-slate-400 transition-transform ${customerDropdownOpen ? 'rotate-180' : ''}`} />
                                </button>
                            )}

                            {/* Dropdown */}
                            {customerDropdownOpen && !selectedCustomer && (
                                <div className="absolute z-50 mt-1 w-full rounded-sm border border-slate-200 bg-white shadow-xl">
                                    <div className="p-2 border-b border-slate-100">
                                        <div className="relative">
                                            <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                                            <input
                                                autoFocus
                                                type="text"
                                                value={customerSearch}
                                                onChange={(e) => setCustomerSearch(e.target.value)}
                                                placeholder="Search by name, phone..."
                                                className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                            />
                                        </div>
                                    </div>
                                    <ul className="max-h-52 overflow-y-auto py-1">
                                        {filteredCustomers.length === 0 ? (
                                            <li className="px-3 py-3 text-center text-xs text-slate-400">No customers found</li>
                                        ) : (
                                            filteredCustomers.map((c) => (
                                                <li key={c._id}>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleSelectCustomer(c)}
                                                        className="flex w-full items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                                                    >
                                                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-sm bg-slate-100">
                                                            <UserIcon className="h-3.5 w-3.5 text-slate-500" />
                                                        </div>
                                                        <div>
                                                            <p className="text-xs font-semibold text-slate-900">{c.name}</p>
                                                            <p className="text-[10px] text-slate-400">
                                                                {c.address || [c.phone, c.email].filter(Boolean).join(' · ') || 'No contact info'}
                                                            </p>
                                                        </div>
                                                    </button>
                                                </li>
                                            ))
                                        )}
                                    </ul>
                                </div>
                            )}
                        </div>

                        {/* Selected customer address if present */}
                        {selectedCustomer?.address && (
                            <p className="mt-2 text-[10px] text-slate-400">
                                <span className="font-medium text-slate-500">Address:</span> {selectedCustomer.address}
                            </p>
                        )}
                    </section>

                    {/* Products */}
                    <section className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-base font-bold text-slate-900">Order Items</h2>
                            <button
                                onClick={addItem}
                                className="flex items-center gap-1.5 rounded-sm bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-dark transition-colors"
                            >
                                <PlusIcon className="h-3.5 w-3.5" />
                                Add Item
                            </button>
                        </div>

                        {/* Product Search */}
                        <div className="relative mb-3">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                value={productSearch}
                                onChange={(e) => setProductSearch(e.target.value)}
                                placeholder="Search products by name, SKU, category, or supplier..."
                                className="w-full rounded-sm border border-slate-200 bg-slate-50/50 pl-10 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                            />
                            {/* Search Results Dropdown */}
                            {productSearch.trim() && searchableProducts.length > 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-sm shadow-lg max-h-60 overflow-y-auto">
                                    {searchableProducts.map((product) => (
                                        <button
                                            key={product._id}
                                            type="button"
                                            onClick={() => handleProductSelect(product)}
                                            className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1">
                                                    <p className="text-xs font-medium text-slate-900">{product.name}</p>
                                                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                                        {product.sku && (
                                                            <span className="text-[10px] text-slate-500">SKU: {product.sku}</span>
                                                        )}
                                                        {product.categoryName && (
                                                            <span className="text-[10px] text-slate-400">• {product.categoryName}</span>
                                                        )}
                                                        {getProductSupplierName(product._id) && (
                                                            <span className="text-[10px] text-slate-400">• Supplier: {getProductSupplierName(product._id)}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-right ml-3">
                                                    <p className="text-xs font-semibold text-brand">৳{product.sellingPrice?.toLocaleString() || '0'}</p>
                                                    <p className="text-[10px] text-slate-500">Stock: {product.stockQuantity || 0}</p>
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                            {productSearch.trim() && searchableProducts.length === 0 && (
                                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-sm shadow-lg p-3">
                                    <p className="text-xs text-slate-500 text-center">No products found</p>
                                </div>
                            )}
                        </div>

                        <table className="w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">S/N</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">Category</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">Product</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Stock</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Qty</th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700">Unit</th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700">Total</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {items.map((item, index) => {
                                    const filteredProducts = getFilteredProducts(item.category, item.product);
                                    const selectedProduct = products.find((p) => p._id === item.product);
                                    const stockQuantity = selectedProduct?.stockQuantity ?? 0;
                                    const selectedIds = items.map(i => i.product).filter(Boolean);
                                    return (
                                        <tr key={index} className="hover:bg-slate-50">
                                            <td className="px-2 py-2 text-center text-xs text-slate-400">{index + 1}</td>
                                            <td className="px-2 py-2">
                                                <select
                                                    value={item.category}
                                                    onChange={(e) => updateItem(index, 'category', e.target.value)}
                                                    className="w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                >
                                                    <option value="">Category</option>
                                                    {categories.map((category) => (
                                                        <option key={category._id} value={category._id}>
                                                            {category.name}
                                                        </option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2">
                                                <select
                                                    value={item.product}
                                                    onChange={(e) => updateItem(index, 'product', e.target.value)}
                                                    disabled={!item.category}
                                                    className="w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20 disabled:bg-slate-100 disabled:cursor-not-allowed"
                                                >
                                                    <option value="">{item.category ? 'Product' : 'Select category'}</option>
                                                    {filteredProducts.map((product) => {
                                                        const isSelected = selectedIds.includes(product._id) && product._id !== item.product;
                                                        return (
                                                            <option 
                                                                key={product._id} 
                                                                value={product._id}
                                                                disabled={isSelected}
                                                            >
                                                                {product.name} - ৳{product.sellingPrice} {isSelected ? '(Already added)' : ''}
                                                            </option>
                                                        );
                                                    })}
                                                </select>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                {item.product ? (
                                                    <span className={`text-xs font-semibold ${stockQuantity === 0 ? 'text-red-600' : stockQuantity <= (selectedProduct?.minStockLevel ?? 0) ? 'text-yellow-600' : 'text-slate-900'}`}>
                                                        {stockQuantity}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <input
                                                    type="number"
                                                    min="1"
                                                    value={item.quantity}
                                                    onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                                    placeholder="1"
                                                    className="w-16 rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-center text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                />
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="relative inline-block">
                                                    <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-slate-500 text-xs">৳</span>
                                                    <input
                                                        type="number"
                                                        step="0.01"
                                                        value={item.unitPrice}
                                                        onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                                        placeholder="0.00"
                                                        disabled={true}
                                                        className="w-20 rounded-sm border border-slate-200 bg-slate-100 pl-5 pr-1.5 py-1.5 text-xs text-right text-slate-900 cursor-not-allowed"
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-right">
                                                <div className="text-xs font-semibold text-slate-900">
                                                    ৳{item.totalPrice.toFixed(2)}
                                                </div>
                                            </td>
                                            <td className="px-2 py-2 text-center">
                                                <button
                                                    onClick={() => removeItem(index)}
                                                    disabled={items.length === 1}
                                                    className="inline-flex items-center px-1.5 py-1 rounded-sm text-xs text-danger hover:bg-red-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    <TrashIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            {items.some(item => item.product) && (
                                <tfoot className="bg-slate-50">
                                    <tr>
                                        <td colSpan={6} className="px-2 py-2 text-right text-xs font-semibold text-slate-900">
                                            Subtotal:
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                            <div className="text-sm font-bold text-slate-900">৳{subtotal.toFixed(2)}</div>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                        {errors.items && (
                            <p className="mt-2 text-[10px] text-danger">{errors.items}</p>
                        )}
                    </section>

                    {/* Additional Details */}
                    <section className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-900 mb-3">Additional Details</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Payment Method
                                </label>
                                <select
                                    value={paymentMethod}
                                    onChange={(e) => setPaymentMethod(e.target.value)}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20"
                                >
                                    <option value="cash">Cash</option>
                                    <option value="card">Card</option>
                                    <option value="mobile_banking">Mobile Banking</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                                    Notes
                                </label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={2}
                                    placeholder="Add notes about this order..."
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 resize-none"
                                />
                            </div>
                        </div>
                    </section>
                </div>
                {/* Summary Sidebar */}
                <div className="space-y-4">
                    {/* Order Summary */}
                    <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm sticky top-6">
                        <div className="flex items-center gap-2 mb-3">
                            <ShoppingCartIcon className="h-4 w-4 text-brand" />
                            <h2 className="text-base font-bold text-slate-900">Sale Summary</h2>
                        </div>

                        <div className="space-y-2.5 mb-3">
                            <div className="flex justify-between text-xs">
                                <span className="text-slate-600">Subtotal</span>
                                <span className="font-semibold text-slate-900">৳{subtotal.toFixed(2)}</span>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Discount (৳)</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500">৳</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={discountAmount}
                                        onChange={(e) => setDiscountAmount(Number(e.target.value))}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-5 pr-2 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Tax (%)</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        max="100"
                                        value={taxPercent}
                                        onChange={(e) => setTaxPercent(Number(e.target.value))}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                    />
                                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">%</span>
                                </div>
                                {taxPercent > 0 && (
                                    <p className="mt-0.5 text-[10px] text-slate-500">Amount: ৳{taxAmount.toFixed(2)}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-[10px] font-semibold text-slate-600 mb-1">Damage (৳)</label>
                                <div className="relative">
                                    <span className="absolute left-2 top-1.5 text-[10px] text-slate-500">৳</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={additionalCharges}
                                        onChange={(e) => setAdditionalCharges(Number(e.target.value))}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-5 pr-2 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-slate-200">
                            <div className="flex justify-between text-sm font-bold">
                                <span>Total</span>
                                <span className="text-brand">৳{totalAmount.toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="mt-4 space-y-2">
                            <button
                                onClick={() => handleSubmit(true)}
                                disabled={isLoading || items.filter((i) => i.product).length === 0}
                                className="w-full flex items-center justify-center gap-1.5 rounded-sm bg-brand px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand/30 transition-all hover:shadow-lg hover:shadow-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PrinterIcon className="h-3.5 w-3.5" />
                                {isLoading ? 'Processing...' : 'Save & Print'}
                            </button>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={isLoading || items.filter((i) => i.product).length === 0}
                                className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Save Only
                            </button>
                            <button
                                onClick={() => navigate('/invoices')}
                                className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CreateSalePage;

