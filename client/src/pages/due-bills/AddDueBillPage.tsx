import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import { useCreateDueBillMutation } from '@/services/dueBillsApi';
import { useGetCustomersQuery, type Customer } from '@/services/customersApi';

const AddDueBillPage = () => {
    const navigate = useNavigate();
    const [createDueBill, { isLoading }] = useCreateDueBillMutation();
    const { data: customersData } = useGetCustomersQuery({ limit: 1000 });

    const [selectedCustomerId, setSelectedCustomerId] = useState('');
    const [partyName, setPartyName] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [error, setError] = useState('');

    const customers = customersData?.customers ?? [];

    const handleCustomerChange = (id: string) => {
        setSelectedCustomerId(id);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!partyName.trim()) return setError('Party name is required');
        if (!amount || Number(amount) <= 0) return setError('Amount must be greater than 0');

        const selectedCustomer: Customer | undefined = customers.find((c) => c._id === selectedCustomerId);

        try {
            await createDueBill({
                customerId: selectedCustomerId || undefined,
                customer: {
                    name: selectedCustomer ? selectedCustomer.name : partyName.trim(),
                    phone: selectedCustomer?.phone || undefined,
                    address: selectedCustomer?.address || undefined,
                },
                partyName: partyName.trim(),
                amount: Number(amount),
                notes: notes.trim() || undefined,
            }).unwrap();
            navigate('/due-bills');
        } catch (err) {
            const e = err as { data?: { message?: string } };
            setError(e?.data?.message ?? 'Failed to create due bill');
        }
    };

    const inputCls = 'w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition-colors';
    const labelCls = 'block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide';

    return (
        <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/due-bills')}
                        className="rounded-sm border border-slate-200 bg-white p-2 text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-700 transition-colors"
                    >
                        <ChevronLeftIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">Finance Management</p>
                        <h1 className="text-2xl font-bold text-slate-900">Add Due Bill</h1>
                    </div>
                </div>

                {/* Form Card */}
                <div className="rounded-sm border border-white/70 bg-white shadow-lg shadow-slate-200/40 overflow-hidden">
                    <div className="border-b border-slate-100 px-6 py-4 bg-slate-50/60">
                        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700">Bill Details</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Fill in the details to create a new due bill</p>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 sm:p-8">
                        {error && (
                            <div className="mb-6 rounded-sm bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                            {/* Customer Dropdown */}
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className={labelCls}>Select Customer <span className="normal-case text-slate-400 font-normal tracking-normal">(optional)</span></label>
                                <select
                                    value={selectedCustomerId}
                                    onChange={(e) => handleCustomerChange(e.target.value)}
                                    className={inputCls}
                                >
                                    <option value="">-- Select existing customer --</option>
                                    {customers.map((c) => (
                                        <option key={c._id} value={c._id}>{c.name}{c.address ? ` - ${c.address}` : ''}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Party Name */}
                            <div className="sm:col-span-1 lg:col-span-2">
                                <label className={labelCls}>Party Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={partyName}
                                    onChange={(e) => setPartyName(e.target.value)}
                                    placeholder="Enter party / business name"
                                    className={inputCls}
                                    required
                                />
                            </div>

                            {/* Amount */}
                            <div className="sm:col-span-1">
                                <label className={labelCls}>Due Amount (৳) <span className="text-red-500">*</span></label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0.01"
                                    step="0.01"
                                    className={inputCls}
                                    required
                                />
                            </div>

                            {/* Notes */}
                            <div className="sm:col-span-2 lg:col-span-3">
                                <label className={labelCls}>Notes <span className="normal-case text-slate-400 font-normal tracking-normal">(optional)</span></label>
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any relevant notes..."
                                    rows={3}
                                    className={inputCls}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-col-reverse gap-3 pt-8 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={() => navigate('/due-bills')}
                                className="w-full rounded-sm border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors sm:w-auto"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-sm bg-brand px-8 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/30 hover:bg-brand/90 hover:shadow-lg disabled:opacity-60 transition-all sm:w-auto"
                            >
                                {isLoading ? 'Creating...' : 'Create Due Bill'}
                            </button>
                        </div>
                    </form>
                </div>
        </div>
    );
};

export default AddDueBillPage;
