import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FunnelIcon,
    MagnifyingGlassIcon,
    PencilIcon,
    TrashIcon,
    PlusIcon
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetProductsQuery, useDeleteProductMutation } from '@/services/productsApi';
import { useGetCategoriesQuery } from '@/services/categoriesApi';
import { usePermissions } from '@/hooks/usePermissions';

const ProductsPage = () => {
    const { canEditDelete } = usePermissions();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const limit = 20;

    const { data, isLoading, isError, refetch } = useGetProductsQuery({
        search,
        page,
        limit,
        categoryId: categoryFilter || undefined
    });

    // Separate query for accurate stats across all products
    const { data: allProductsData } = useGetProductsQuery({ limit: 10000 });

    const { data: categoriesData } = useGetCategoriesQuery({ limit: 100 });
    // Filter to show only active, non-deleted categories
    const categories = useMemo(() =>
        (categoriesData?.categories ?? []).filter(cat => cat.isActive !== false),
        [categoriesData?.categories]
    );

    const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation();

    const products = useMemo(() => data?.products ?? [], [data?.products]);
    const allProducts = useMemo(() => allProductsData?.products ?? [], [allProductsData?.products]);
    const totalPages = useMemo(() => Math.ceil((data?.total ?? 0) / limit), [data?.total, limit]);

    const infoCards = useMemo(
        () => [
            {
                label: 'Active SKUs',
                value: data?.total ?? 0,
                delta: '+0.0%',
                color: 'blue',
                icon: '📦',
                subtitle: 'Tracked this cycle',
            },
            {
                label: 'Stock Value',
                value: `৳${allProducts.reduce((sum, p) => sum + (p.stockQuantity ?? 0) * (p.purchasePrice ?? 0), 0).toLocaleString()}`,
                delta: '+0.0%',
                color: 'emerald',
                icon: '💰',
                subtitle: 'Total inventory value',
            },
            {
                label: 'Low Stock',
                value: allProducts.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= (p.minStockLevel ?? 10)).length,
                delta: '+0.0%',
                color: 'orange',
                icon: '⚠️',
                subtitle: 'Needs reorder',
            },
            {
                label: 'Out of Stock',
                value: allProducts.filter((p) => p.stockQuantity === 0).length,
                delta: '+0.0%',
                color: 'red',
                icon: '🚫',
                subtitle: 'Need restocking',
            },
        ],
        [allProducts, data?.total]
    );

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 10;

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 6) {
                for (let i = 1; i <= maxVisible; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 5) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - (maxVisible - 1); i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 2; i <= page + 2; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const handleEdit = (productId: string) => {
        navigate(`/products/edit/${productId}`);
    };

    const handleDeleteClick = (productId: string) => {
        setDeleteId(productId);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteId) return;

        try {
            await deleteProduct(deleteId).unwrap();
            setDeleteId(null);
        } catch (error) {
            console.error('Failed to delete product:', error);
        }
    };

    const handleDeleteCancel = () => {
        setDeleteId(null);
    };

    if (isLoading) {
        return <Loader fullScreen message="Fetching products..." />;
    }

    if (isError) {
        return <ErrorState description="Unable to fetch product list." onRetry={refetch} />;
    }

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Inventory &amp; Orders</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Products / Services</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => navigate('/products/new')}
                        className="inline-flex items-center gap-2 rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <PlusIcon className="h-5 w-5" />
                        New Product
                    </button>
                </div>
            </div>

            <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                {infoCards.map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${
                                    card.color === 'emerald' ? 'text-emerald-600' :
                                    card.color === 'orange' ? 'text-orange-600' :
                                    card.color === 'red' ? 'text-red-600' :
                                    'text-blue-600'
                                } group-hover:scale-105 transition-transform duration-300`}>
                                    {card.value}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{card.subtitle}</p>
                            </div>
                            <div className={`rounded-sm p-2 ${
                                card.color === 'emerald' ? 'bg-emerald-100' :
                                card.color === 'orange' ? 'bg-orange-100' :
                                card.color === 'red' ? 'bg-red-100' :
                                'bg-blue-100'
                            } opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
                                <div className={`h-2 w-2 rounded-sm ${
                                    card.color === 'emerald' ? 'bg-emerald-500' :
                                    card.color === 'orange' ? 'bg-orange-500' :
                                    card.color === 'red' ? 'bg-red-500' :
                                    'bg-blue-500'
                                }`}></div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center">
                            <span className={`text-xs font-semibold ${card.delta.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                                {card.delta}
                            </span>
                            <span className="ml-1 text-xs text-slate-400">vs last month</span>
                        </div>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none ${
                            card.color === 'emerald' ? 'bg-emerald-500' :
                            card.color === 'orange' ? 'bg-orange-500' :
                            card.color === 'red' ? 'bg-red-500' :
                            'bg-blue-500'
                        }`}></div>
                    </div>
                ))}
            </section>

            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                {/* Filters */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-xs">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search by product, SKU, category..."
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1); // Reset to first page when searching
                            }}
                            className="w-full rounded-sm border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2">
                            <FunnelIcon className="h-4 w-4 text-slate-400" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    setPage(1); // Reset to first page when filtering
                                }}
                                className="border-none bg-transparent text-sm font-medium text-slate-600 focus:ring-0 cursor-pointer"
                            >
                                <option value="">All Categories</option>
                                {categories.map((category) => (
                                    <option key={category._id} value={category._id}>
                                        {category.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                        <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-2.5 pr-4">S/N</th>
                                <th className="py-2.5 pr-4">Code</th>
                                <th className="py-2.5 pr-4">Product</th>
                                <th className="py-2.5 pr-4">Category</th>
                                <th className="py-2.5 pr-4">Unit</th>
                                <th className="py-2.5 pr-4">Ctn Size</th>
                                <th className="py-2.5 pr-4">Rate/pc</th>
                                <th className="py-2.5 pr-4">Stock (pcs)</th>
                                <th className="py-2.5 pr-4">Free</th>
                                <th className="py-2.5">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {products.map((product, idx) => {
                                return (
                                    <tr key={product._id} className="transition hover:bg-slate-50/70">
                                        <td className="py-2.5 pr-4 text-slate-400">{idx + 1}</td>
                                        <td className="py-2.5 pr-4 font-semibold text-slate-900">{product.sku ?? '—'}</td>
                                        <td className="py-2.5 pr-4">
                                            <p className="font-semibold text-slate-900">{product.name}</p>
                                            <p className="text-[10px] text-slate-400">#{product._id.slice(-5)}</p>
                                        </td>
                                        <td className="py-2.5 pr-4 text-slate-700">{product.categoryName ?? 'Unassigned'}</td>
                                        <td className="py-2.5 pr-4">
                                            <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold ${product.unit === 'Dozen' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                                {product.unit}
                                            </span>
                                        </td>
                                        <td className="py-2.5 pr-4 text-slate-600">
                                            {product.unit === 'Cartoon' ? (product.cartoonSize ?? '—') : '—'}
                                        </td>
                                        <td className="py-2.5 pr-4 font-semibold text-slate-900">৳{(product.sellingPrice ?? 0).toLocaleString()}</td>
                                        <td className="py-2.5 pr-4 font-semibold text-slate-900">{(product.stockQuantity ?? 0).toLocaleString()}</td>
                                        <td className="py-2.5 pr-4 text-slate-600">{product.free ? product.free : '—'}</td>
                                        <td className="py-2.5">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEdit(product._id)}
                                                    disabled={!canEditDelete}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                                                    title={canEditDelete ? 'Edit product' : 'No permission'}
                                                >
                                                    <PencilIcon className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteClick(product._id)}
                                                    disabled={!canEditDelete}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-red-50 hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                                                    title={canEditDelete ? 'Delete product' : 'No permission'}
                                                >
                                                    <TrashIcon className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {products.length === 0 && (
                        <div className="py-10 text-center text-sm text-slate-500">No products match your filters.</div>
                    )}
                </div>

                {/* Pagination */}
                {(data?.total ?? 0) > 0 && (
                    <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                        <p className="text-sm text-slate-600">
                            Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
                            <span className="font-semibold text-slate-900">{Math.min(page * limit, data?.total ?? 0)}</span> of{' '}
                            <span className="font-semibold text-slate-900">{data?.total ?? 0}</span> entries
                        </p>
                        <div className="flex items-center gap-1.5">
                            <button
                                onClick={() => handlePageChange(page - 1)}
                                disabled={page === 1}
                                className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Previous
                            </button>
                            {getPageNumbers().map((pageNum, idx) => (
                                pageNum === '...' ? (
                                    <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-slate-400">...</span>
                                ) : (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum as number)}
                                        className={`flex h-9 min-w-[36px] items-center justify-center rounded-sm px-3 text-sm font-semibold transition-all ${page === pageNum ? 'bg-brand text-white shadow-md shadow-brand/30' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            ))}
                            <button
                                onClick={() => handlePageChange(page + 1)}
                                disabled={page === totalPages}
                                className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* Delete Confirmation Modal */}
            {deleteId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="mx-4 w-full max-w-md rounded-sm border border-white/70 bg-white p-6 shadow-2xl">
                        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm bg-red-100">
                            <TrashIcon className="h-6 w-6 text-red-600" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900">Delete Product</h3>
                        <p className="mt-2 text-sm text-slate-600">
                            Are you sure you want to delete this product? This action will mark the product as deleted but can be recovered by an administrator.
                        </p>
                        <div className="mt-6 flex gap-3">
                            <button
                                onClick={handleDeleteCancel}
                                disabled={isDeleting}
                                className="flex-1 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="flex-1 rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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

export default ProductsPage;

