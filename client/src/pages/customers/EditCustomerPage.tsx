import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PencilSquareIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import { useGetCustomerQuery, useUpdateCustomerMutation } from '@/services/customersApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';

type Customer = { _id: string; name: string; phone?: string; address?: string; status: 'active' | 'inactive' };

const EditCustomerPage = () => {
    const { id } = useParams<{ id: string }>();
    const { data: customer, isLoading, isError, refetch } = useGetCustomerQuery(id!);

    if (isLoading) return <Loader fullScreen message="Loading customer..." />;
    if (isError || !customer) return <ErrorState description="Unable to load customer" onRetry={refetch} />;

    return <EditCustomerForm customer={customer as Customer} id={id!} />;
};

const EditCustomerForm = ({ customer, id }: { customer: Customer; id: string }) => {
    const navigate = useNavigate();
    const [updateCustomer, { isLoading: isSaving }] = useUpdateCustomerMutation();

    const [formData, setFormData] = useState({
        name: customer.name,
        phone: customer.phone ?? '',
        address: customer.address ?? '',
        status: customer.status,
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
            await updateCustomer({
                id,
                data: {
                    name: formData.name.trim(),
                    phone: formData.phone.trim() || undefined,
                    address: formData.address.trim() || undefined,
                    status: formData.status,
                },
            }).unwrap();
            toast.success('Distributor updated successfully');
            navigate('/customers');
        } catch {
            toast.error('Failed to update distributor');
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
                    <h1 className="mt-1 text-3xl font-bold text-slate-900">Edit Distributor</h1>
                    <p className="text-sm text-slate-500">Update distributor information.</p>
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

                    {/* Row 3: Address */}
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
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 rounded-sm bg-linear-to-r from-brand to-brand-dark px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition hover:shadow-xl hover:shadow-brand/40 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
                        >
                            <PencilSquareIcon className="h-4 w-4" />
                            {isSaving ? 'Saving...' : 'Save Changes'}
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

export default EditCustomerPage;
