/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo } from 'react';
import dayjs from 'dayjs';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetProductsQuery } from '@/services/productsApi';
import { useGetOrdersQuery } from '@/services/ordersApi';
import { useGetPurchasesQuery } from '@/services/purchasesApi';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';

type HistoryTab = 'sales' | 'purchases';

const HistoryPage = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
    const [activeTabs, setActiveTabs] = useState<Record<string, HistoryTab>>({});
    const [page, setPage] = useState(1);
    const limit = 20;

    const { data: productsData, isLoading: productsLoading, isError: productsError, refetch: refetchProducts } = useGetProductsQuery({ limit: 10000 });
    const { data: ordersData, isLoading: ordersLoading } = useGetOrdersQuery({ limit: 10000 });
    const { data: purchasesData, isLoading: purchasesLoading } = useGetPurchasesQuery({ limit: 10000 });

    const isLoading = productsLoading || ordersLoading || purchasesLoading;

    const filteredProducts = useMemo(() => {
        if (!productsData?.products) return [];
        if (!searchQuery.trim()) return productsData.products;
        const query = searchQuery.toLowerCase().trim();
        return productsData.products.filter((product: any) => {
            const name = product.name?.toLowerCase() || '';
            const sku = product.sku?.toLowerCase() || '';
            const category = product.categoryName?.toLowerCase() || '';
            return name.includes(query) || sku.includes(query) || category.includes(query);
        });
    }, [productsData, searchQuery]);

    const paginatedProducts = useMemo(() => filteredProducts.slice((page - 1) * limit, page * limit), [filteredProducts, page]);
    const totalPages = Math.ceil(filteredProducts.length / limit);

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
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else if (page <= 6) {
            for (let i = 1; i <= maxVisible; i++) pages.push(i);
            pages.push('...');
            pages.push(totalPages);
        } else if (page >= totalPages - 5) {
            pages.push(1);
            pages.push('...');
            for (let i = totalPages - (maxVisible - 1); i <= totalPages; i++) pages.push(i);
        } else {
            pages.push(1);
            pages.push('...');
            for (let i = page - 2; i <= page + 2; i++) pages.push(i);
            pages.push('...');
            pages.push(totalPages);
        }
        return pages;
    };

    const getProductHistory = (productId: string) => {
        const sales: any[] = [];
        const purchases: any[] = [];

        if (ordersData?.result) {
            ordersData.result.forEach((order: any) => {
                order.items?.forEach((item: any) => {
                    const itemProductId = typeof item.product === 'string' ? item.product : item.product?._id;
                    if (itemProductId === productId) {
                        sales.push({
                            ...item,
                            orderNumber: order.orderNumber,
                            orderDate: order.createdAt,
                            customer: order.customer,
                            type: 'sale'
                        });
                    }
                });
            });
        }

        if (purchasesData?.result) {
            purchasesData.result.forEach((purchase: any) => {
                purchase.items?.forEach((item: any) => {
                    const itemProductId = typeof item.product === 'string' ? item.product : item.product?._id;
                    if (itemProductId === productId) {
                        purchases.push({
                            ...item,
                            purchaseNumber: purchase.purchaseNumber,
                            purchaseDate: purchase.createdAt,
                            supplier: purchase.supplier,
                            type: 'purchase'
                        });
                    }
                });
            });
        }

        return { sales, purchases };
    };

    const toggleProduct = (productId: string) => {
        const newExpanded = new Set(expandedProducts);
        if (newExpanded.has(productId)) {
            newExpanded.delete(productId);
        } else {
            newExpanded.add(productId);
            if (!activeTabs[productId]) {
                setActiveTabs({ ...activeTabs, [productId]: 'sales' });
            }
        }
        setExpandedProducts(newExpanded);
    };

    const setActiveTab = (productId: string, tab: HistoryTab) => {
        setActiveTabs({ ...activeTabs, [productId]: tab });
    };

    if (isLoading) return <Loader fullScreen message="Loading history..." />;
    if (productsError) return <ErrorState description="Unable to load history" onRetry={refetchProducts} />;

    return (
        <div className="space-y-4">
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-brand">Reports</p>
                <h1 className="mt-1 text-xl font-bold text-slate-900">History</h1>
            </div>

            {/* Search */}
            <div className="rounded-sm border border-slate-200 bg-white p-2 shadow-sm">
                <div className="relative">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => { setSearchQuery(e.target.value); setPage(1); setExpandedProducts(new Set()); setActiveTabs({}); }}
                        placeholder="Search products..."
                        className="w-full rounded border border-slate-200 bg-white px-2 py-1.5 pl-7 text-[10px] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                    />
                    <svg className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                </div>
            </div>

            {/* Main Products Table */}
            <div className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                        <thead className="bg-slate-50">
                            <tr>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-700 w-6"></th>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-700 w-8">S/N</th>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Product</th>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-700">SKU</th>
                                <th className="px-2 py-1.5 text-left font-semibold text-slate-700">Category</th>
                                <th className="px-2 py-1.5 text-center font-semibold text-slate-700">Stock</th>
                                <th className="px-2 py-1.5 text-right font-semibold text-slate-700">Price</th>
                                <th className="px-2 py-1.5 text-center font-semibold text-slate-700">Sales</th>
                                <th className="px-2 py-1.5 text-center font-semibold text-slate-700">Purchases</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {filteredProducts.length === 0 ? (
                                <tr>
                                    <td colSpan={9} className="px-2 py-3 text-center text-[10px] text-slate-500">
                                        {searchQuery ? 'No products found matching your search' : 'No products found'}
                                    </td>
                                </tr>
                            ) : (
                                paginatedProducts.map((product: any, idx: number) => {
                                    const isExpanded = expandedProducts.has(product._id);
                                    const history = getProductHistory(product._id);
                                    const totalSales = history.sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
                                    const totalPurchases = history.purchases.reduce((sum, p) => sum + (p.quantity || 0), 0);

                                    return (
                                        <>
                                            <tr key={product._id} className="hover:bg-slate-50">
                                                <td className="px-2 py-1.5">
                                                    <button onClick={() => toggleProduct(product._id)} className="text-slate-400 hover:text-slate-600">
                                                        {isExpanded ? <ChevronUpIcon className="h-3 w-3" /> : <ChevronDownIcon className="h-3 w-3" />}
                                                    </button>
                                                </td>
                                                <td className="px-2 py-1.5 text-slate-400 text-xs">{(page - 1) * limit + idx + 1}</td>
                                                <td className="px-2 py-1.5 font-medium text-slate-900">{product.name}</td>
                                                <td className="px-2 py-1.5 text-slate-600">{product.sku || '-'}</td>
                                                <td className="px-2 py-1.5 text-slate-600">{product.categoryName || '-'}</td>
                                                <td className="px-2 py-1.5 text-center text-slate-900 font-semibold">{product.stockQuantity}</td>
                                                <td className="px-2 py-1.5 text-right text-slate-600">৳{product.sellingPrice?.toLocaleString()}</td>
                                                <td className="px-2 py-1.5 text-center text-blue-600">{totalSales}</td>
                                                <td className="px-2 py-1.5 text-center text-green-600">{totalPurchases}</td>
                                            </tr>
                                            {isExpanded && (() => {
                                                const activeTab = activeTabs[product._id] || 'sales';
                                                return (
                                                    <tr>
                                                        <td colSpan={9} className="px-0 py-0 bg-slate-50">
                                                            <div className="p-2">
                                                                {/* Tabs */}
                                                                <div className="flex gap-1 mb-2 border-b border-slate-200">
                                                                    {[
                                                                        { id: 'sales' as HistoryTab, label: 'Sales', count: history.sales.length },
                                                                        { id: 'purchases' as HistoryTab, label: 'Purchases', count: history.purchases.length },
                                                                    ].map((tab) => {
                                                                        const isActive = activeTab === tab.id;
                                                                        let activeClasses = '';
                                                                        if (isActive) {
                                                                            if (tab.id === 'sales') activeClasses = 'bg-blue-50 text-blue-700 border-b-2 border-blue-500';
                                                                            else if (tab.id === 'purchases') activeClasses = 'bg-green-50 text-green-700 border-b-2 border-green-500';
                                                                        }
                                                                        return (
                                                                            <button
                                                                                key={tab.id}
                                                                                onClick={() => setActiveTab(product._id, tab.id)}
                                                                                className={`px-2 py-1 text-[9px] font-semibold rounded-t transition-colors ${isActive ? activeClasses : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}`}
                                                                            >
                                                                                {tab.label} ({tab.count})
                                                                            </button>
                                                                        );
                                                                    })}
                                                                </div>

                                                                {/* Tab Content */}
                                                                <div className="mt-2">
                                                                    {activeTab === 'sales' && (
                                                                        <div className="overflow-x-auto">
                                                                            {history.sales.length === 0 ? (
                                                                                <p className="text-[9px] text-slate-500 text-center py-3">No sales history</p>
                                                                            ) : (
                                                                                <table className="w-full text-[9px]">
                                                                                    <thead className="bg-blue-50">
                                                                                        <tr>
                                                                                            <th className="px-1.5 py-1 text-left font-semibold text-slate-700">Date</th>
                                                                                            <th className="px-1.5 py-1 text-left font-semibold text-slate-700">Order #</th>
                                                                                            <th className="px-1.5 py-1 text-left font-semibold text-slate-700">Customer</th>
                                                                                            <th className="px-1.5 py-1 text-center font-semibold text-slate-700">Qty</th>
                                                                                            <th className="px-1.5 py-1 text-right font-semibold text-slate-700">Unit Price</th>
                                                                                            <th className="px-1.5 py-1 text-right font-semibold text-slate-700">Total</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-slate-200 bg-white">
                                                                                        {history.sales.map((sale: any, i: number) => (
                                                                                            <tr key={i} className="hover:bg-slate-50">
                                                                                                <td className="px-1.5 py-1 text-slate-600">{dayjs(sale.orderDate).format('DD MMM YY')}</td>
                                                                                                <td className="px-1.5 py-1 font-medium text-slate-900">{sale.orderNumber}</td>
                                                                                                <td className="px-1.5 py-1 text-slate-600">{sale.customer?.name || 'N/A'}</td>
                                                                                                <td className="px-1.5 py-1 text-center text-slate-600">{sale.quantity}</td>
                                                                                                <td className="px-1.5 py-1 text-right text-slate-600">৳{sale.unitPrice?.toLocaleString()}</td>
                                                                                                <td className="px-1.5 py-1 text-right font-semibold text-blue-600">৳{sale.totalPrice?.toLocaleString()}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            )}
                                                                        </div>
                                                                    )}

                                                                    {activeTab === 'purchases' && (
                                                                        <div className="overflow-x-auto">
                                                                            {history.purchases.length === 0 ? (
                                                                                <p className="text-[9px] text-slate-500 text-center py-3">No purchase history</p>
                                                                            ) : (
                                                                                <table className="w-full text-[9px]">
                                                                                    <thead className="bg-green-50">
                                                                                        <tr>
                                                                                            <th className="px-1.5 py-1 text-left font-semibold text-slate-700">Date</th>
                                                                                            <th className="px-1.5 py-1 text-left font-semibold text-slate-700">Purchase #</th>
                                                                                            <th className="px-1.5 py-1 text-left font-semibold text-slate-700">Supplier</th>
                                                                                            <th className="px-1.5 py-1 text-center font-semibold text-slate-700">Qty</th>
                                                                                            <th className="px-1.5 py-1 text-right font-semibold text-slate-700">Unit Price</th>
                                                                                            <th className="px-1.5 py-1 text-right font-semibold text-slate-700">Total</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-slate-200 bg-white">
                                                                                        {history.purchases.map((purchase: any, i: number) => (
                                                                                            <tr key={i} className="hover:bg-slate-50">
                                                                                                <td className="px-1.5 py-1 text-slate-600">{dayjs(purchase.purchaseDate).format('DD MMM YY')}</td>
                                                                                                <td className="px-1.5 py-1 font-medium text-slate-900">{purchase.purchaseNumber}</td>
                                                                                                <td className="px-1.5 py-1 text-slate-600">
                                                                                                    {typeof purchase.supplier === 'object' ? purchase.supplier?.name : purchase.supplier || 'N/A'}
                                                                                                </td>
                                                                                                <td className="px-1.5 py-1 text-center text-slate-600">{purchase.quantity}</td>
                                                                                                <td className="px-1.5 py-1 text-right text-slate-600">৳{purchase.unitPrice?.toLocaleString()}</td>
                                                                                                <td className="px-1.5 py-1 text-right font-semibold text-green-600">৳{purchase.totalPrice?.toLocaleString()}</td>
                                                                                            </tr>
                                                                                        ))}
                                                                                    </tbody>
                                                                                </table>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })()}
                                        </>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {filteredProducts.length > 0 && (
                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                    <p className="text-sm text-slate-600">
                        Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-semibold text-slate-900">{Math.min(page * limit, filteredProducts.length)}</span> of{' '}
                        <span className="font-semibold text-slate-900">{filteredProducts.length}</span> entries
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
        </div>
    );
};

export default HistoryPage;
