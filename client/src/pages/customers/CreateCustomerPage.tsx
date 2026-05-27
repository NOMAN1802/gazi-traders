import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useCreateCustomerMutation } from '@/services/customersApi';

const CreateCustomerPage = () => {
    const navigate = useNavigate();
    const [createCustomer, { isLoading }] = useCreateCustomerMutation();

    const [formData, setFormData] = useState({
        name: '',
        phone: '',
        address: '',
        status: 'active' as 'active' | 'inactive',
    });

    const [errors, setErrors] = useState<Partial<typeof formData>>({});

    const validate = () => {
        const newErrors: Partial<typeof formData> = {};
        if (!formData.name.trim()) newErrors.name = 'Name is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (errors[name as keyof typeof errors]) {
            setErrors((prev) => ({ ...prev, [name]: undefined }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            const payload = {
                name: formData.name.trim(),
                phone: formData.phone.trim() || undefined,
                address: formData.address.trim() || undefined,
                status: formData.status,
            };
            await createCustomer(payload).unwrap();
            toast.success('Distributor created successfully');
            navigate('/customers');
        } catch {
            toast.error('Failed to create customer');
        }
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate('/customers')}
                    className="flex h-10 w-10 items-center justify-center rounded-sm border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900"
                >
                    <ArrowLeftIcon className="h-5 w-5" />
                </button>
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">CRM Layer</p>
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">Create Distributor</h1>
                    <p className="text-sm text-slate-500">Add a new distributor to your CRM.</p>
                </div>
            </div>

            {/* Form */}
            <div className="rounded-sm border border-white/70 bg-white/90 p-4 sm:p-6 lg:p-8 shadow-card">
                <form onSubmit={handleSubmit} className="space-y-6 w-full">
                    {/* Row 1: Distributor Name + Mobile Number */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">
                                Distributor Name <span className="text-danger">*</span>
                            </label>
                            <input
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="e.g. Rahim Uddin"
                                className={`w-full rounded-sm border px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 transition ${
                                    errors.name
                                        ? 'border-danger bg-danger/5 focus:ring-danger/20'
                                        : 'border-slate-200 bg-white focus:border-brand focus:ring-brand/20'
                                }`}
                            />
                            {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
                        </div>

                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Mobile Number</label>
                            <input
                                name="phone"
                                value={formData.phone}
                                onChange={handleChange}
                                placeholder="e.g. 01XXXXXXXXX"
                                className="w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition"
                            />
                        </div>
                    </div>

                    {/* Row 2: Status */}
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="mb-1.5 block text-sm font-semibold text-slate-700">Status</label>
                            <select
                                name="status"
                                value={formData.status}
                                onChange={handleChange}
                                className="w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition"
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    {/* Row 3: Address (full width) */}
                    <div>
                        <label className="mb-1.5 block text-sm font-semibold text-slate-700">Address</label>
                        <textarea
                            name="address"
                            value={formData.address}
                            onChange={handleChange}
                            rows={3}
                            placeholder="e.g. Dhaka, Bangladesh"
                            className="w-full rounded-sm border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 transition resize-none"
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="inline-flex items-center gap-2 rounded-sm bg-linear-to-r from-brand to-brand-dark px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:shadow-xl hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <UserPlusIcon className="h-4 w-4" />
                            {isLoading ? 'Creating...' : 'Create Distributor'}
                        </button>
                        <button
                            type="button"
                            onClick={() => navigate('/customers')}
                            className="rounded-sm border border-slate-200 bg-white px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateCustomerPage;
