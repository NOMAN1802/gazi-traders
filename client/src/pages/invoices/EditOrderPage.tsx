/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeftIcon,
    PlusIcon,
    TrashIcon,
    PrinterIcon,
    ShoppingCartIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useGetProductsQuery } from '@/services/productsApi';
import { useGetOrderByIdQuery, useUpdateOrderMutation } from '@/services/ordersApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';

type OrderItem = {
    product: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
};

type CustomerInfo = {
    name: string;
    email: string;
    phone: string;
    address: string;
};

const EditOrderPage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const { data: productsData } = useGetProductsQuery({ limit: 1000 });
    const { data: order, isLoading: loadingOrder, isError: errorOrder } = useGetOrderByIdQuery(id!, { skip: !id });
    const [updateOrder, { isLoading: updating }] = useUpdateOrderMutation();

    const [customer, setCustomer] = useState<CustomerInfo>({
        name: '',
        email: '',
        phone: '',
        address: '',
    });

    const [items, setItems] = useState<OrderItem[]>([]);
    const [status, setStatus] = useState<string>('pending');
    const [discountAmount, setDiscountAmount] = useState(0);
    const [tax, setTax] = useState(0);
    const [additionalCharges, setAdditionalCharges] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [notes, setNotes] = useState('');
    const [_errors, setErrors] = useState<{ [key: string]: string }>({});
    const prevOrderIdRef = useRef<string | undefined>(undefined);

    // Populate form when order data is loaded (only when order ID changes to avoid cascading renders)
    useEffect(() => {
        if (!order) return;

        // Only update if this is a new order (order ID changed)
        if (prevOrderIdRef.current !== order._id) {
            prevOrderIdRef.current = order._id;
            // Defer setState to avoid synchronous setState in effect
            queueMicrotask(() => {
                setCustomer({
                    name: order.customer.name,
                    email: order.customer.email || 'customer@gmail.com',
                    phone: order.customer.phone || '',
                    address: order.customer.address || '',
                });

                // Map order items to form items
                // Note: order.items has product object populated, but we need ID for the select
                const formItems = order.items.map((item: any) => ({
                    product: typeof item.product === 'object' ? item.product._id : item.product,
                    productName: item.productName,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    totalPrice: item.totalPrice,
                }));

                setItems(formItems);
                setStatus(order.status);
                setDiscountAmount(order.discount || 0);
                setTax(order.tax || 0);
                setAdditionalCharges(order.additionalCharges || 0);
                setPaymentMethod(order.paymentMethod || 'cash');
                setNotes(order.notes || '');
            });
        }
    }, [order]);

    const products = useMemo(() => productsData?.products ?? [], [productsData]);

    const subtotal = useMemo(() => {
        return items.reduce((sum, item) => sum + item.totalPrice, 0);
    }, [items]);

    const totalAmount = useMemo(() => {
        return subtotal - discountAmount + tax - additionalCharges;
    }, [subtotal, discountAmount, tax, additionalCharges]);

    const addItem = () => {
        setItems([
            ...items,
            { product: '', productName: '', quantity: 1, unitPrice: 0, totalPrice: 0 },
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

        if (field === 'product') {
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

    const validateEmail = (email: string): boolean => {
        if (!email) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = async (print: boolean = false) => {
        if (!id) return;

        try {
            setErrors({});

            const validItems = items.filter((item) => item.product && item.quantity > 0);

            if (validItems.length === 0) {
                setErrors({ items: 'Please add at least one product to the order' });
                toast.error('Please add at least one product to the order');
                return;
            }

            if (customer.email && customer.email.trim() && !validateEmail(customer.email.trim())) {
                setErrors({ email: 'Please enter a valid email address' });
                toast.error('Please enter a valid email address');
                return;
            }

            const orderData: any = {
                customer: {
                    name: customer.name.trim() || 'Walk-in Customer',
                    email: customer.email?.trim(),
                    phone: customer.phone?.trim(),
                    address: customer.address?.trim(),
                },
                items: validItems,
                status,
                subtotal: Number(subtotal),
                discount: Number(discountAmount.toFixed(2)),
                tax: Number(tax),
                additionalCharges: Number(additionalCharges),
                totalAmount: Number(totalAmount),
                paymentMethod: paymentMethod?.trim(),
                notes: notes?.trim(),
            };

            console.log('Updating order data:', orderData);

            await updateOrder({ id, data: orderData }).unwrap();

            if (print) {
                window.open(`/invoices/${id}/print`, '_blank');
            }

            navigate('/invoices');
        } catch (error: any) {
            console.error('Failed to update order:', error);
            let errorMessage = 'Failed to update order.';
            if (error?.data?.message) {
                errorMessage = error.data.message;
            }
            toast.error(errorMessage);
        }
    };

    if (loadingOrder) return <Loader fullScreen message="Loading order details..." />;
    if (errorOrder || !order) return <ErrorState description="Unable to load order" />;

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
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Order Management</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">Edit Order <span className="text-slate-400">#{order.orderNumber}</span></h1>
                    </div>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
                {/* Main Form - 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Customer Information */}
                    <section className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-900 mb-3">Customer Information</h2>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Customer Name</label>
                                <input
                                    type="text"
                                    value={customer.name}
                                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone Number</label>
                                <input
                                    type="tel"
                                    value={customer.phone}
                                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                                <input
                                    type="email"
                                    value={customer.email}
                                    onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Address</label>
                                <input
                                    type="text"
                                    value={customer.address}
                                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all"
                                />
                            </div>
                        </div>
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

                        <table className="w-full divide-y divide-slate-200">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">S/N</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-700">Product</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Qty</th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700">Unit Price</th>
                                    <th className="px-2 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-700">Total</th>
                                    <th className="px-2 py-2 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-700">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 bg-white">
                                {items.map((item, index) => (
                                    <tr key={index} className="hover:bg-slate-50">
                                        <td className="px-2 py-2 text-center text-xs text-slate-400">{index + 1}</td>
                                        <td className="px-2 py-2">
                                            <select
                                                value={item.product}
                                                onChange={(e) => updateItem(index, 'product', e.target.value)}
                                                className="w-full rounded-sm border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                            >
                                                <option value="">Select Product</option>
                                                {products.map((product) => (
                                                    <option key={product._id} value={product._id}>
                                                        {product.name} - ৳{product.sellingPrice}
                                                    </option>
                                                ))}
                                            </select>
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
                                                    className="w-24 rounded-sm border border-slate-200 bg-white pl-5 pr-1.5 py-1.5 text-xs text-right text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                />
                                            </div>
                                        </td>
                                        <td className="px-2 py-2 text-right">
                                            <div className="text-xs font-semibold text-slate-900">৳{item.totalPrice.toFixed(2)}</div>
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
                                ))}
                            </tbody>
                            {items.some(item => item.product) && (
                                <tfoot className="bg-slate-50">
                                    <tr>
                                        <td colSpan={4} className="px-2 py-2 text-right text-xs font-semibold text-slate-900">Subtotal:</td>
                                        <td className="px-2 py-2 text-right">
                                            <div className="text-sm font-bold text-slate-900">৳{subtotal.toFixed(2)}</div>
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </section>

                    {/* Additional Details */}
                    <section className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm">
                        <h2 className="text-base font-bold text-slate-900 mb-3">Additional Details</h2>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Order Status</label>
                                <select
                                    value={status}
                                    onChange={(e) => setStatus(e.target.value)}
                                    className={`w-full rounded-sm border border-slate-200 px-3 py-2 text-xs font-semibold focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 ${status === 'completed' ? 'text-emerald-600 bg-emerald-50' :
                                        status === 'pending' ? 'text-amber-600 bg-amber-50' :
                                            'text-blue-600 bg-blue-50'
                                        }`}
                                >
                                    <option value="pending">Pending (Unpaid)</option>
                                    <option value="partial">Partial</option>
                                    <option value="completed">Completed (Paid)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Payment Method</label>
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
                                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Notes</label>
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
                    <div className="rounded-sm border border-slate-200/60 bg-white p-4 shadow-sm sticky top-6">
                        <div className="flex items-center gap-2 mb-3">
                            <ShoppingCartIcon className="h-4 w-4 text-brand" />
                            <h2 className="text-base font-bold text-slate-900">Order Summary</h2>
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
                                        min="0"
                                        step="0.01"
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
                                        value={tax}
                                        onChange={(e) => setTax(Number(e.target.value))}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                    />
                                    <span className="absolute right-2 top-1.5 text-[10px] text-slate-500">%</span>
                                </div>
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
                                disabled={updating || items.filter((i) => i.product).length === 0}
                                className="w-full flex items-center justify-center gap-1.5 rounded-sm bg-brand px-3 py-2 text-xs font-semibold text-white shadow-md shadow-brand/30 transition-all hover:shadow-lg hover:shadow-brand/40 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <PrinterIcon className="h-3.5 w-3.5" />
                                {updating ? 'Updating...' : 'Update & Print'}
                            </button>
                            <button
                                onClick={() => handleSubmit(false)}
                                disabled={updating || items.filter((i) => i.product).length === 0}
                                className="w-full rounded-sm border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Update Order
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

export default EditOrderPage;

