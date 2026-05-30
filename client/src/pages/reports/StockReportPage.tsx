/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import * as XLSX from 'xlsx';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetProductsQuery } from '@/services/productsApi';
import { useGetOrdersQuery } from '@/services/ordersApi';
import { useGetStockIntakesQuery } from '@/services/stockIntakesApi';
import { useGetSuppliersQuery } from '@/services/suppliersApi';
import { PrinterIcon, TableCellsIcon } from '@heroicons/react/24/outline';

const StockReportPage = () => {
    const [activeTab, setActiveTab] = useState(0);
    const [searchQuery, setSearchQuery] = useState('');
    const reportRef = useRef<HTMLDivElement>(null);

    // Load all suppliers to build dynamic tabs
    const { data: suppliersData, isLoading: suppliersLoading } = useGetSuppliersQuery({ limit: 1000 });
    const suppliers = useMemo(() => suppliersData?.suppliers ?? [], [suppliersData]);
    const activeSupplierId = suppliers[activeTab]?._id;

    // Fetch products for the active supplier via server-side filter (no name matching needed)
    const {
        data: productsData,
        isLoading: productsLoading,
        isError: productsError,
        refetch: refetchProducts,
    } = useGetProductsQuery(
        { limit: 10000, supplierId: activeSupplierId },
        { skip: !activeSupplierId }
    );

    const { data: ordersData, isLoading: ordersLoading } = useGetOrdersQuery({ limit: 10000 });
    const { data: stockIntakesData, isLoading: intakesLoading } = useGetStockIntakesQuery({ limit: 10000 });

    const isLoading = suppliersLoading || productsLoading || ordersLoading || intakesLoading;

    // Aggregate Stock In (received pieces) per product across all intakes
    const stockInByProduct = useMemo(() => {
        const map: Record<string, number> = {};
        stockIntakesData?.result.forEach(intake => {
            intake.items.forEach(item => {
                map[item.product] = (map[item.product] || 0) + (item.receivedPieces || 0);
            });
        });
        return map;
    }, [stockIntakesData]);

    // Aggregate Stock Out (sold quantity) per product across all orders
    const stockOutByProduct = useMemo(() => {
        const map: Record<string, number> = {};
        ordersData?.result.forEach((order: any) => {
            order.items?.forEach((item: any) => {
                const pid = typeof item.product === 'string' ? item.product : item.product?._id;
                if (pid) map[pid] = (map[pid] || 0) + (item.quantity || 0);
            });
        });
        return map;
    }, [ordersData]);

    // Apply search filter on top of the already supplier-filtered products
    const filteredProducts = useMemo(() => {
        const all = productsData?.products ?? [];
        const q = searchQuery.toLowerCase().trim();
        if (!q) return all;
        return all.filter((p: any) =>
            p.name?.toLowerCase().includes(q) || p.categoryName?.toLowerCase().includes(q)
        );
    }, [productsData, searchQuery]);

    const activeSupplierName = suppliers[activeTab]?.name ?? '';

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Stock_Report_${activeSupplierName.replace(/ /g, '_')}_${dayjs().format('YYYY-MM-DD')}`,
        pageStyle: `@page { size: A4 landscape; margin: 12mm; }`,
    });

    const handleDownloadExcel = () => {
        const headers = ['S/N', 'Product Name', 'Category', 'Stock', 'Stock In', 'Stock Out', 'Balance'];
        const rows = filteredProducts.map((product: any, idx: number) => {
            const stockIn  = stockInByProduct[product._id]  || 0;
            const stockOut = stockOutByProduct[product._id] || 0;
            return [
                idx + 1,
                product.name ?? '',
                product.categoryName ?? '-',
                product.stockQuantity ?? 0,
                stockIn,
                stockOut,
                stockIn - stockOut,
            ];
        });
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeSupplierName.slice(0, 31));
        XLSX.writeFile(wb, `Stock_Report_${activeSupplierName.replace(/ /g, '_')}_${dayjs().format('YYYY-MM-DD_HH-mm')}.xlsx`);
    };

    if (suppliersLoading) return <Loader fullScreen message="Loading suppliers..." />;
    if (productsError) return <ErrorState description="Unable to load stock report" onRetry={refetchProducts} />;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search products..."
                            className="w-64 rounded border border-slate-200 bg-white px-2 py-1.5 pl-7 text-[10px] focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand/20"
                        />
                        <svg
                            className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <button
                        type="button"
                        onClick={handleDownloadExcel}
                        disabled={filteredProducts.length === 0}
                        className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand/20 disabled:opacity-40"
                    >
                        <TableCellsIcon className="h-3.5 w-3.5" />
                        Download Excel
                    </button>
                    <button
                        type="button"
                        onClick={() => handlePrint()}
                        className="inline-flex items-center gap-1.5 rounded border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-medium text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-1 focus:ring-brand/20"
                    >
                        <PrinterIcon className="h-3.5 w-3.5" />
                        Print
                    </button>
                </div>
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-brand">Reports</p>
                    <h1 className="mt-1 text-xl font-bold text-slate-900">Stock Report</h1>
                </div>
            </div>

            {/* Factory Tabs — built from DB suppliers */}
            {suppliers.length > 0 && (
                <div className="flex border-b border-slate-200 print:hidden">
                    {suppliers.map((supplier, i) => (
                        <button
                            key={supplier._id}
                            type="button"
                            onClick={() => { setActiveTab(i); setSearchQuery(''); }}
                            className={`px-5 py-2 text-xs font-semibold border-b-2 transition-colors -mb-px whitespace-nowrap ${
                                activeTab === i
                                    ? 'border-brand text-brand bg-white'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                        >
                            {supplier.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Factory label for print */}
            <div className="hidden print:block text-sm font-semibold text-slate-700 mb-1">
                {activeSupplierName}
            </div>

            {/* Table */}
            <div ref={reportRef} className="rounded-sm border border-slate-200 bg-white shadow-sm overflow-hidden">
                {(productsLoading || ordersLoading || intakesLoading) ? (
                    <div className="flex items-center justify-center py-16 text-[11px] text-slate-400">
                        Loading products...
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-700 w-10">S/N</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Product Name</th>
                                    <th className="px-3 py-2 text-left font-semibold text-slate-700">Category</th>
                                    <th className="px-3 py-2 text-center font-semibold text-slate-700">Stock</th>
                                    <th className="px-3 py-2 text-center font-semibold text-emerald-700">Stock In</th>
                                    <th className="px-3 py-2 text-center font-semibold text-red-600">Stock Out</th>
                                    <th className="px-3 py-2 text-center font-semibold text-brand">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredProducts.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="px-3 py-8 text-center text-[10px] text-slate-400">
                                            {!activeSupplierId
                                                ? 'No suppliers found. Add a supplier first.'
                                                : searchQuery
                                                ? 'No products match your search'
                                                : `No products found for ${activeSupplierName}`}
                                        </td>
                                    </tr>
                                ) : (
                                    filteredProducts.map((product: any, idx: number) => {
                                        const stockIn  = stockInByProduct[product._id]  || 0;
                                        const stockOut = stockOutByProduct[product._id] || 0;
                                        const balance  = stockIn - stockOut;
                                        return (
                                            <tr key={product._id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                                <td className="px-3 py-2 font-medium text-slate-900">{product.name}</td>
                                                <td className="px-3 py-2 text-slate-500">{product.categoryName || '—'}</td>
                                                <td className="px-3 py-2 text-center font-semibold text-slate-800">{product.stockQuantity ?? 0}</td>
                                                <td className="px-3 py-2 text-center font-semibold text-emerald-600">{stockIn}</td>
                                                <td className="px-3 py-2 text-center font-semibold text-red-500">{stockOut}</td>
                                                <td className={`px-3 py-2 text-center font-bold ${balance >= 0 ? 'text-brand' : 'text-red-600'}`}>
                                                    {balance}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                            {filteredProducts.length > 0 && (
                                <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                                    <tr>
                                        <td colSpan={3} className="px-3 py-2 font-semibold text-slate-700 text-[10px]">
                                            Total ({filteredProducts.length} products)
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-slate-800 text-[10px]">
                                            {filteredProducts.reduce((s: number, p: any) => s + (p.stockQuantity || 0), 0)}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-emerald-600 text-[10px]">
                                            {filteredProducts.reduce((s: number, p: any) => s + (stockInByProduct[p._id] || 0), 0)}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-red-500 text-[10px]">
                                            {filteredProducts.reduce((s: number, p: any) => s + (stockOutByProduct[p._id] || 0), 0)}
                                        </td>
                                        <td className="px-3 py-2 text-center font-bold text-brand text-[10px]">
                                            {filteredProducts.reduce((s: number, p: any) => s + ((stockInByProduct[p._id] || 0) - (stockOutByProduct[p._id] || 0)), 0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StockReportPage;
