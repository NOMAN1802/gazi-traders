/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import {
    PlusIcon,
    PencilIcon,
    TrashIcon,
    BuildingStorefrontIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { usePermissions } from '@/hooks/usePermissions';
import {
    useGetSuppliersQuery,
    useCreateSupplierMutation,
    useUpdateSupplierMutation,
    useDeleteSupplierMutation
} from '@/services/suppliersApi';
import { toast } from 'sonner';

const emptyForm = { name: '', phone: '', address: '', status: 'active' as 'active' | 'inactive' };

const SuppliersPage = () => {
    const { canEditDelete } = usePermissions();
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [formData, setFormData] = useState(emptyForm);

    const { data, isLoading, isError, refetch } = useGetSuppliersQuery({ search, limit: 100 });
    const [createSupplier, { isLoading: isCreating }] = useCreateSupplierMutation();
    const [updateSupplier, { isLoading: isUpdating }] = useUpdateSupplierMutation();
    const [deleteSupplier, { isLoading: isDeleting }] = useDeleteSupplierMutation();

    const suppliers = useMemo(() => data?.suppliers ?? [], [data?.suppliers]);

    const handleOpenModal = (supplier?: typeof suppliers[0]) => {
        if (supplier) {
            setEditingId(supplier._id);
            setFormData({
                name: supplier.name,
                phone: supplier.phone ?? '',
                address: supplier.address ?? '',
                status: supplier.status,
            });
        } else {
            setEditingId(null);
            setFormData(emptyForm);
        }
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData(emptyForm);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            toast.error('Factory name is required');
            return;
        }
        try {
            const payload = {
                name: formData.name.trim(),
                phone: formData.phone.trim() || undefined,
                address: formData.address.trim() || undefined,
                status: formData.status,
            };
            if (editingId) {
                await updateSupplier({ id: editingId, data: payload }).unwrap();
                toast.success('Factory updated successfully');
            } else {
                await createSupplier(payload).unwrap();
                toast.success('Factory created successfully');
            }
            handleCloseModal();
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to save factory');
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;
        try {
            await deleteSupplier(deleteId).unwrap();
            toast.success('Factory deleted successfully');
            setDeleteId(null);
        } catch (error: any) {
            toast.error(error?.data?.message || 'Failed to delete factory');
        }
    };

    if (isLoading) return <Loader fullScreen message="Loading factories..." />;
    if (isError) return <ErrorState description="Unable to fetch factories." onRetry={refetch} />;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Product Management</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Factories</h1>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="inline-flex items-center gap-2 rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                    <PlusIcon className="h-5 w-5" />
                    New Factory
                </button>
            </div>

            {/* Stats Card */}
            <div className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">🏭</span>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Factories</p>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{suppliers.length}</p>
                        <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">
                            {suppliers.filter(s => s.status === 'active').length} Active
                        </p>
                    </div>
                    <div className="rounded-sm p-2 bg-blue-100">
                        <BuildingStorefrontIcon className="h-6 w-6 text-blue-500" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="mb-6 flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2">
                    <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                    <input
                        className="w-full border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                        placeholder="Search factories..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-3 pr-4">S/N</th>
                                <th className="py-3 pr-4">Factory Name</th>
                                <th className="py-3 pr-4">Number</th>
                                <th className="py-3 pr-4">Address</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {suppliers.map((supplier, idx) => (
                                <tr key={supplier._id} className="transition hover:bg-slate-50/70">
                                    <td className="py-4 pr-4 text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="py-4 pr-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-9 w-9 items-center justify-center rounded-sm bg-brand/10">
                                                <BuildingStorefrontIcon className="h-4 w-4 text-brand" />
                                            </div>
                                            <p className="font-semibold text-slate-900">{supplier.name}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 pr-4 text-slate-700">{supplier.phone || '—'}</td>
                                    <td className="py-4 pr-4 text-slate-700">{supplier.address || '—'}</td>
                                    <td className="py-4 pr-4">
                                        <span className={`inline-flex items-center rounded-sm px-3 py-1 text-xs font-semibold ${
                                            supplier.status === 'active'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-slate-100 text-slate-700'
                                        }`}>
                                            {supplier.status === 'active' ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                    <td className="py-4">
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleOpenModal(supplier)}
                                                disabled={!canEditDelete}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
                                                title={canEditDelete ? 'Edit' : 'No permission'}
                                            >
                                                <PencilIcon className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteId(supplier._id)}
                                                disabled={!canEditDelete}
                                                className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
                                                title={canEditDelete ? 'Delete' : 'No permission'}
                                            >
                                                <TrashIcon className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {suppliers.length === 0 && (
                        <div className="py-10 text-center text-sm text-slate-500">
                            {search ? 'No factories match your search.' : 'No factories yet. Create your first one!'}
                        </div>
                    )}
                </div>
            </section>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-md rounded-sm border border-white/70 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-brand/10">
                            <BuildingStorefrontIcon className="h-6 w-6 text-brand" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">
                            {editingId ? 'Edit Factory' : 'Add Factory'}
                        </h3>
                        <p className="mt-1 text-sm text-slate-500">
                            {editingId ? 'Update factory details.' : 'Add a new factory to your system.'}
                        </p>
                        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    Factory Name <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                    placeholder="e.g. ABC Factory"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Number</label>
                                <input
                                    type="text"
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                    placeholder="e.g. 01XXXXXXXXX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                                    placeholder="Factory address..."
                                />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    disabled={isCreating || isUpdating}
                                    className="flex-1 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating || isUpdating || !formData.name.trim()}
                                    className="flex-1 rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand/90 disabled:opacity-50"
                                >
                                    {isCreating || isUpdating ? 'Saving...' : editingId ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-sm rounded-sm border border-white/70 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-red-100">
                            <TrashIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">Delete Factory</h3>
                        <p className="mt-2 text-sm text-slate-600">Are you sure? This action cannot be undone.</p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={() => setDeleteId(null)}
                                disabled={isDeleting}
                                className="flex-1 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                            >
                                {isDeleting ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SuppliersPage;
