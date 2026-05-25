import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useUpdatePurchaseMutation, type Purchase } from '@/services/purchasesApi';

interface EditPurchaseModalProps {
    purchase: Purchase | null;
    onClose: () => void;
}

type FormData = {
    supplierName: string;
    supplierPhone: string;
    supplierEmail: string;
    supplierContactPerson: string;
    supplierAddress: string;
    status: 'pending' | 'completed' | 'partial';
    paidAmount: string;
    paymentMethod: string;
    notes: string;
};

type EditableItem = {
    productName: string;
    quantity: number;
    unitPrice: string;
    markupPercent: string;
    sellingPrice: string;
    totalPrice: number;
};

const EditPurchaseModal = ({ purchase, onClose }: EditPurchaseModalProps) => {
    const [updatePurchase, { isLoading }] = useUpdatePurchaseMutation();

    const [formData, setFormData] = useState<FormData>({
        supplierName: purchase?.supplier?.name || '',
        supplierPhone: purchase?.supplier?.phone || '',
        supplierEmail: purchase?.supplier?.email || '',
        supplierContactPerson: purchase?.supplier?.contactPerson || '',
        supplierAddress: purchase?.supplier?.address || '',
        status: purchase?.status || 'pending',
        paidAmount: purchase?.paidAmount != null ? String(purchase.paidAmount) : '',
        paymentMethod: purchase?.paymentMethod || '',
        notes: purchase?.notes || '',
    });

    const [editableItems, setEditableItems] = useState<EditableItem[]>(
        (purchase?.items || []).map((item) => ({
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice ?? ''),
            markupPercent: String(item.markupPercent ?? ''),
            sellingPrice: String(item.sellingPrice ?? ''),
            totalPrice: item.totalPrice ?? 0,
        }))
    );

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!purchase) return null;

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleItemChange = (index: number, field: keyof Pick<EditableItem, 'unitPrice' | 'markupPercent' | 'sellingPrice'>, value: string) => {
        setEditableItems((prev) => {
            const updated = [...prev];
            const item = { ...updated[index], [field]: value };
            const unitPrice = parseFloat(field === 'unitPrice' ? value : item.unitPrice) || 0;
            const markupPercent = parseFloat(field === 'markupPercent' ? value : item.markupPercent) || 0;
            if (field === 'unitPrice' || field === 'markupPercent') {
                item.sellingPrice = markupPercent > 0 ? String((unitPrice * (1 + markupPercent / 100)).toFixed(2)) : item.sellingPrice;
            }
            item.totalPrice = unitPrice * item.quantity;
            updated[index] = item;
            return updated;
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const updatedItems = editableItems.map((item, i) => ({
            ...purchase.items[i],
            unitPrice: parseFloat(item.unitPrice) || purchase.items[i].unitPrice,
            markupPercent: item.markupPercent !== '' ? parseFloat(item.markupPercent) : undefined,
            sellingPrice: item.sellingPrice !== '' ? parseFloat(item.sellingPrice) : undefined,
            totalPrice: (parseFloat(item.unitPrice) || purchase.items[i].unitPrice) * item.quantity,
        }));
        const newTotalAmount = updatedItems.reduce((sum, it) => sum + it.totalPrice, 0);
        try {
            await updatePurchase({
                id: purchase._id,
                data: {
                    supplier: {
                        _id: purchase.supplier?._id,
                        name: formData.supplierName,
                        phone: formData.supplierPhone || undefined,
                        email: formData.supplierEmail || undefined,
                        contactPerson: formData.supplierContactPerson || undefined,
                        address: formData.supplierAddress || undefined,
                    },
                    status: formData.status,
                    paidAmount: formData.paidAmount !== '' ? parseFloat(formData.paidAmount) : undefined,
                    paymentMethod: formData.paymentMethod || undefined,
                    notes: formData.notes || undefined,
                    items: updatedItems,
                    totalAmount: newTotalAmount,
                },
            }).unwrap();
            onClose();
        } catch (error) {
            console.error('Failed to update purchase:', error);
        }
    };

    const inputClass = 'w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all';
    const labelClass = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative w-full max-w-3xl rounded-sm bg-white shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-900">Edit Purchase</h2>
                        <p className="text-sm text-slate-500">{purchase.purchaseNumber}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit}>
                    <div className="max-h-[70vh] overflow-y-auto px-6 py-5 space-y-5">
                        {/* Purchase Items — editable prices */}
                        {editableItems.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-800 mb-3">Purchased Items</h3>
                                <div className="rounded-sm border border-slate-100 overflow-hidden">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="text-left px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide">Product</th>
                                                <th className="text-center px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide">Qty</th>
                                                <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide">Unit Price</th>
                                                <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide">Markup %</th>
                                                <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide">Sell Price</th>
                                                <th className="text-right px-3 py-2 text-slate-500 font-semibold uppercase tracking-wide">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {editableItems.map((item, index) => (
                                                <tr key={index} className="hover:bg-slate-50/50">
                                                    <td className="px-3 py-2 text-slate-700 font-medium">{item.productName}</td>
                                                    <td className="px-3 py-2 text-center text-slate-600">{item.quantity}</td>
                                                    <td className="px-3 py-1.5 text-right">
                                                        <input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            className="w-24 rounded-sm border border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right">
                                                        <input
                                                            type="number"
                                                            value={item.markupPercent}
                                                            onChange={(e) => handleItemChange(index, 'markupPercent', e.target.value)}
                                                            min="0"
                                                            step="0.1"
                                                            placeholder="0"
                                                            className="w-20 rounded-sm border border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5 text-right">
                                                        <input
                                                            type="number"
                                                            value={item.sellingPrice}
                                                            onChange={(e) => handleItemChange(index, 'sellingPrice', e.target.value)}
                                                            min="0"
                                                            step="0.01"
                                                            placeholder="0"
                                                            className="w-24 rounded-sm border border-slate-200 bg-white px-2 py-1 text-right text-xs text-slate-900 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-2 text-right font-semibold text-slate-900">
                                                        ৳{item.totalPrice.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="mt-2 space-y-1 rounded-sm bg-slate-50 px-4 py-3 text-xs">
                                    {(purchase.discount ?? 0) > 0 && (
                                        <div className="flex justify-between text-slate-600">
                                            <span>Discount</span>
                                            <span className="text-red-500">-৳{purchase.discount!.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {(purchase.tax ?? 0) > 0 && (
                                        <div className="flex justify-between text-slate-600">
                                            <span>Tax</span>
                                            <span>+৳{purchase.tax!.toLocaleString()}</span>
                                        </div>
                                    )}
                                    {(purchase.additionalCharges ?? 0) > 0 && (
                                        <div className="flex justify-between text-slate-600">
                                            <span>Additional Charges</span>
                                            <span>+৳{purchase.additionalCharges!.toLocaleString()}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between font-bold text-slate-900 border-t border-slate-200 pt-1.5 mt-1">
                                        <span>Total Amount</span>
                                        <span className="text-green-600">
                                            ৳{editableItems.reduce((sum, it) => sum + it.totalPrice, 0).toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="border-t border-slate-100" />

                        {/* Supplier Info */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Supplier Information</h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Supplier Name <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        value={formData.supplierName}
                                        onChange={(e) => handleChange('supplierName', e.target.value)}
                                        className={inputClass}
                                        placeholder="Supplier name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Phone</label>
                                    <input
                                        type="text"
                                        value={formData.supplierPhone}
                                        onChange={(e) => handleChange('supplierPhone', e.target.value)}
                                        className={inputClass}
                                        placeholder="Phone number"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Contact Person</label>
                                    <input
                                        type="text"
                                        value={formData.supplierContactPerson}
                                        onChange={(e) => handleChange('supplierContactPerson', e.target.value)}
                                        className={inputClass}
                                        placeholder="Contact person"
                                    />
                                </div>
                                <div>
                                    <label className={labelClass}>Email</label>
                                    <input
                                        type="email"
                                        value={formData.supplierEmail}
                                        onChange={(e) => handleChange('supplierEmail', e.target.value)}
                                        className={inputClass}
                                        placeholder="Email address"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Address</label>
                                    <input
                                        type="text"
                                        value={formData.supplierAddress}
                                        onChange={(e) => handleChange('supplierAddress', e.target.value)}
                                        className={inputClass}
                                        placeholder="Address"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Payment Info */}
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 mb-3">Payment Information</h3>
                            <div className="grid gap-3 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>Status</label>
                                    <select
                                        value={formData.status}
                                        onChange={(e) => handleChange('status', e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="partial">Partial</option>
                                        <option value="completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>Paid Amount</label>
                                    <input
                                        type="number"
                                        value={formData.paidAmount}
                                        onChange={(e) => handleChange('paidAmount', e.target.value)}
                                        min="0"
                                        step="0.01"
                                        className={inputClass}
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className={labelClass}>Payment Method</label>
                                    <select
                                        value={formData.paymentMethod}
                                        onChange={(e) => handleChange('paymentMethod', e.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="">Select method</option>
                                        <option value="cash">Cash</option>
                                        <option value="bank_transfer">Bank Transfer</option>
                                        <option value="check">Check</option>
                                        <option value="mobile_banking">Mobile Banking</option>
                                        <option value="credit">Credit</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100" />

                        {/* Notes */}
                        <div>
                            <label className={labelClass}>Notes</label>
                            <textarea
                                value={formData.notes}
                                onChange={(e) => handleChange('notes', e.target.value)}
                                rows={3}
                                className={`${inputClass} resize-none`}
                                placeholder="Add any notes..."
                            />
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-sm border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="rounded-sm bg-linear-to-r from-brand to-brand-dark px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/40 transition-all hover:shadow-xl hover:shadow-brand/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditPurchaseModal;
