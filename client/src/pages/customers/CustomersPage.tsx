import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetCustomersQuery, useDeleteCustomerMutation } from '@/services/customersApi';
import { toast } from 'sonner';
import { usePermissions } from '@/hooks/usePermissions';

const statusBadge = (status: 'active' | 'inactive') =>
    status === 'active'
        ? 'inline-flex items-center rounded-sm bg-green-50 px-2.5 py-0.5 text-xs font-semibold text-green-700 ring-1 ring-green-600/20'
        : 'inline-flex items-center rounded-sm bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-300';

const CustomersPage = () => {
    const { canEditDelete } = usePermissions();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');

    const { data, isLoading, isError, refetch } = useGetCustomersQuery({ limit: 1000 });
    const [deleteCustomer, { isLoading: isDeleting }] = useDeleteCustomerMutation();

    const customers = useMemo(() => data?.customers ?? [], [data]);

    const filtered = useMemo(() => {
        if (!search.trim()) return customers;
        const q = search.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.phone?.toLowerCase().includes(q) ||
            c.address?.toLowerCase().includes(q)
        );
    }, [customers, search]);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Delete customer "${name}"?`)) return;
        try {
            await deleteCustomer(id).unwrap();
            toast.success('Customer deleted');
        } catch {
            toast.error('Failed to delete customer');
        }
    };

    if (isLoading) return <Loader fullScreen message="Loading customers..." />;
    if (isError) return <ErrorState description="Unable to load customers" onRetry={refetch} />;

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">CRM Layer</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Distributor List</h1>
                <p className="text-sm text-slate-500">All registered distributors in your CRM.</p>
            </div>

            {/* Search */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="relative max-w-md">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search by name, phone, or address..."
                        className="w-full rounded-sm border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                </div>
            </section>

            {/* Table */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-3 pr-4">S/N</th>
                                <th className="py-3 pr-4">Name</th>
                                <th className="py-3 pr-4">Phone</th>
                                <th className="py-3 pr-4">Address</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3 pr-4">Created On</th>
                                <th className="py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {filtered.map((customer, idx) => (
                                <tr key={customer._id} className="transition hover:bg-slate-50/70">
                                    <td className="py-4 pr-4 text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="py-4 pr-4 font-semibold text-slate-900">{customer.name}</td>
                                    <td className="py-4 pr-4">{customer.phone || '-'}</td>
                                    <td className="py-4 pr-4 max-w-[200px] truncate">{customer.address || '-'}</td>
                                    <td className="py-4 pr-4">
                                        <span className={statusBadge(customer.status)}>
                                            {customer.status.charAt(0).toUpperCase() + customer.status.slice(1)}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4">{dayjs(customer.createdAt).format('DD MMM YYYY')}</td>
                                    <td className="py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/customers/${customer._id}/edit`)}
                                                disabled={!canEditDelete}
                                                className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                                            >
                                                <PencilIcon className="h-3 w-3" />
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(customer._id, customer.name)}
                                                disabled={isDeleting || !canEditDelete}
                                                className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                                            >
                                                <TrashIcon className="h-3 w-3" />
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="py-10 text-center text-sm text-slate-500">
                            {search ? 'No distributors match your search.' : 'No distributors yet. Create your first one.'}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default CustomersPage;
