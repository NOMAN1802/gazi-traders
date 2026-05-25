import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, CheckIcon, TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import dayjs from 'dayjs';
import { useGetPurchaseByIdQuery, useUpdatePurchaseMutation, type Purchase, type PurchaseItem } from '@/services/purchasesApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';

type EditableItem = PurchaseItem & { _key: string };

const inputClass =
    'w-full rounded-sm border border-slate-200 bg-slate-50/50 px-2.5 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand/20 transition-all';
const labelClass = 'block text-[10px] font-semibold text-slate-500 mb-1 uppercase tracking-wide';

const EditPurchasePage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: purchase, isLoading, isError, refetch } = useGetPurchaseByIdQuery(id!);

    if (isLoading) return <Loader fullScreen message="Loading purchase..." />;
    if (isError || !purchase) return <ErrorState description="Purchase not found." onRetry={refetch} />;

    return <EditPurchaseForm purchase={purchase} />;
};

const EditPurchaseForm = ({ purchase }: { purchase: Purchase }) => {
    const navigate = useNavigate();
    const [updatePurchase, { isLoading: isSaving }] = useUpdatePurchaseMutation();

    const [items, setItems] = useState<EditableItem[]>(() =>
        purchase.items.map((item, i) => ({ ...item, _key: String(i) }))
    );
    const [supplierName, setSupplierName] = useState(purchase.supplier.name || '');
    const [supplierPhone, setSupplierPhone] = useState(purchase.supplier.phone || '');
    const [supplierEmail, setSupplierEmail] = useState(purchase.supplier.email || '');
    const [supplierContactPerson, setSupplierContactPerson] = useState(purchase.supplier.contactPerson || '');
    const [supplierAddress, setSupplierAddress] = useState(purchase.supplier.address || '');
    const [notes, setNotes] = useState(purchase.notes || '');

    const updateItem = (key: string, field: keyof PurchaseItem, value: number) => {
        setItems((prev) =>
            prev.map((item) => {
                if (item._key !== key) return item;
                const updated = { ...item, [field]: value };
                if (field === 'quantity' || field === 'unitPrice') {
                    const qty = field === 'quantity' ? value : item.quantity;
                    const price = field === 'unitPrice' ? value : item.unitPrice;
                    updated.totalPrice = qty * price;
                    if (field === 'unitPrice' && item.markupPercent) {
                        updated.sellingPrice = parseFloat((value * (1 + item.markupPercent / 100)).toFixed(2));
                    }
                }
                if (field === 'markupPercent') {
                    updated.sellingPrice = parseFloat((item.unitPrice * (1 + value / 100)).toFixed(2));
                }
                if (field === 'sellingPrice') {
                    if (item.unitPrice > 0) {
                        updated.markupPercent = parseFloat((((value / item.unitPrice) - 1) * 100).toFixed(2));
                    }
                }
                return updated;
            })
        );
    };

    const removeItem = (key: string) => {
        setItems((prev) => prev.filter((item) => item._key !== key));
    };

    const subtotal = items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    const grandTotal = subtotal - (purchase?.discount || 0) + (purchase?.tax || 0) + (purchase?.additionalCharges || 0);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!purchase) return;
        if (items.length === 0) {
            toast.error('Purchase must have at least one item');
            return;
        }
        try {
            await updatePurchase({
                id: purchase._id,
                data: {
                    supplier: {
                        _id: purchase.supplier._id,
                        name: supplierName,
                        phone: supplierPhone || undefined,
                        email: supplierEmail || undefined,
                        contactPerson: supplierContactPerson || undefined,
                        address: supplierAddress || undefined,
                    },
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    items: items.map(({ _key, ...item }) => item),
                    subtotal,
                    totalAmount: grandTotal,
                    notes: notes || undefined,
                },
            }).unwrap();
            toast.success('Purchase updated successfully');
            navigate('/purchases');
        } catch {
            toast.error('Failed to update purchase');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Page Header */}
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <button
                        type="button"
                        onClick={() => navigate('/purchases')}
                        className="flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeftIcon className="h-4 w-4" />
                    </button>
                    <div>
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-brand">Edit Purchase</p>
                        <h1 className="text-lg font-bold text-slate-900">{purchase.purchaseNumber}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => navigate('/purchases')}
                        className="rounded-sm border border-slate-200 bg-white px-4 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                    >
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="inline-flex items-center gap-1.5 rounded-sm bg-brand px-4 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand/30 hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        <CheckIcon className="h-3.5 w-3.5" />
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>

            {/* Items Table */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-4 shadow-card">
                <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">Purchase Items</h2>
                    <span className="text-[10px] text-slate-400">{dayjs(purchase.createdAt).format('DD MMM YYYY')}</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full">
                        <thead>
                            <tr className="border-b border-slate-200">
                                <th className="pb-2 pr-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">S/N</th>
                                <th className="pb-2 pr-2 text-left text-[10px] font-semibold uppercase tracking-wide text-slate-400">Item</th>
                                <th className="pb-2 pr-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">Qty</th>
                                <th className="pb-2 pr-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">Unit Price</th>
                                <th className="pb-2 pr-2 text-center text-[10px] font-semibold uppercase tracking-wide text-slate-400">Markup %</th>
                                <th className="pb-2 pr-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">Selling Price</th>
                                <th className="pb-2 pr-2 text-right text-[10px] font-semibold uppercase tracking-wide text-slate-400">Total</th>
                                <th className="pb-2 w-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {items.map((item, index) => (
                                <tr key={item._key} className="group">
                                    <td className="py-1.5 pr-2 text-[10px] text-slate-400 align-middle">{index + 1}</td>
                                    <td className="py-1.5 pr-2 align-middle">
                                        <span className="text-xs font-medium text-slate-900">{item.productName}</span>
                                        {item.categoryName && (
                                            <span className="ml-1 text-[10px] text-slate-400">{item.categoryName}</span>
                                        )}
                                    </td>
                                    <td className="py-1.5 pr-2 align-middle">
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => updateItem(item._key, 'quantity', Number(e.target.value))}
                                            className="w-16 rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-1 text-center text-xs focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                        />
                                    </td>
                                    <td className="py-1.5 pr-2 align-middle">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <span className="text-[10px] text-slate-300">৳</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.unitPrice}
                                                onChange={(e) => updateItem(item._key, 'unitPrice', Number(e.target.value))}
                                                className="w-20 rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-1 text-right text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-1.5 pr-2 align-middle">
                                        <div className="flex items-center justify-center gap-0.5">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.1"
                                                value={item.markupPercent ?? ''}
                                                onChange={(e) => updateItem(item._key, 'markupPercent', Number(e.target.value))}
                                                className="w-16 rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-1 text-center text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                            />
                                            <span className="text-[10px] text-slate-300">%</span>
                                        </div>
                                    </td>
                                    <td className="py-1.5 pr-2 align-middle">
                                        <div className="flex items-center justify-end gap-0.5">
                                            <span className="text-[10px] text-slate-300">৳</span>
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={item.sellingPrice != null ? Number(item.sellingPrice).toFixed(2) : ''}
                                                onChange={(e) => updateItem(item._key, 'sellingPrice', Number(e.target.value))}
                                                className="w-20 rounded-sm border border-slate-200 bg-slate-50 px-1.5 py-1 text-right text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                            />
                                        </div>
                                    </td>
                                    <td className="py-1.5 pr-2 text-right align-middle text-xs font-semibold text-slate-900">
                                        ৳{(item.totalPrice || 0).toLocaleString()}
                                    </td>
                                    <td className="py-1.5 text-center align-middle">
                                        <button
                                            type="button"
                                            onClick={() => removeItem(item._key)}
                                            disabled={items.length === 1}
                                            className="invisible group-hover:visible flex h-6 w-6 items-center justify-center rounded text-slate-300 hover:bg-red-50 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                        >
                                            <TrashIcon className="h-3.5 w-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Totals */}
                <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <div className="w-48 space-y-1">
                        <div className="flex justify-between text-xs text-slate-600">
                            <span>Subtotal</span>
                            <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
                        </div>
                        {(purchase.discount || 0) > 0 && (
                            <div className="flex justify-between text-xs text-orange-600">
                                <span>Discount</span>
                                <span className="font-semibold">-৳{(purchase.discount || 0).toLocaleString()}</span>
                            </div>
                        )}
                        {(purchase.tax || 0) > 0 && (
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Tax</span>
                                <span className="font-semibold">+৳{(purchase.tax || 0).toLocaleString()}</span>
                            </div>
                        )}
                        {(purchase.additionalCharges || 0) > 0 && (
                            <div className="flex justify-between text-xs text-slate-600">
                                <span>Additional Charges</span>
                                <span className="font-semibold">+৳{(purchase.additionalCharges || 0).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between border-t border-slate-300 pt-1.5 text-sm font-bold text-slate-900">
                            <span>Grand Total</span>
                            <span className="text-brand">৳{grandTotal.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Supplier Info */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-4 shadow-card">
                <h2 className="mb-3 text-xs font-bold text-slate-900 uppercase tracking-wide">Supplier Information</h2>
                <div className="grid gap-3 sm:grid-cols-3">
                    <div className="sm:col-span-1">
                        <label className={labelClass}>Supplier Name <span className="text-red-500">*</span></label>
                        <input type="text" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className={inputClass} placeholder="Supplier name" required />
                    </div>
                    <div>
                        <label className={labelClass}>Phone</label>
                        <input type="text" value={supplierPhone} onChange={(e) => setSupplierPhone(e.target.value)} className={inputClass} placeholder="Phone number" />
                    </div>
                    <div>
                        <label className={labelClass}>Contact Person</label>
                        <input type="text" value={supplierContactPerson} onChange={(e) => setSupplierContactPerson(e.target.value)} className={inputClass} placeholder="Contact person" />
                    </div>
                    <div>
                        <label className={labelClass}>Email</label>
                        <input type="email" value={supplierEmail} onChange={(e) => setSupplierEmail(e.target.value)} className={inputClass} placeholder="Email address" />
                    </div>
                    <div>
                        <label className={labelClass}>Address</label>
                        <input type="text" value={supplierAddress} onChange={(e) => setSupplierAddress(e.target.value)} className={inputClass} placeholder="Address" />
                    </div>
                    <div>
                        <label className={labelClass}>Notes</label>
                        <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} placeholder="Add notes..." />
                    </div>
                </div>
            </section>
        </form>
    );
};

export default EditPurchasePage;
