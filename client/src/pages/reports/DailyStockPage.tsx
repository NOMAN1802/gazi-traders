import { useRef } from 'react';
import { useState } from 'react';
import { PrinterIcon } from '@heroicons/react/24/outline';
import { useReactToPrint } from 'react-to-print';
import { useGetDailyStockQuery } from '@/services/reportsApi';
import Loader from '@/components/common/Loader';

const today = () => new Date().toISOString().slice(0, 10);

export default function DailyStockPage() {
    const [date, setDate] = useState(today);
    const printRef = useRef<HTMLDivElement>(null);

    const { data, isLoading, isFetching } = useGetDailyStockQuery({ date });

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Daily Stock - ${date}`,
        pageStyle: `
            @page { size: A4 landscape; margin: 8mm; }
            body { font-family: Arial, sans-serif; font-size: 9px; color: #000; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #000; padding: 3px 5px; text-align: center; white-space: nowrap; }
            th { background: #f0f0f0; font-weight: bold; }
            .name-col { text-align: left; }
            .no-print { display: none !important; }
        `,
    });

    const products = data?.products ?? [];
    const customers = data?.customers ?? [];

    return (
        <div className="space-y-4">
            {/* Header bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Reports</p>
                    <h1 className="mt-1 text-2xl font-bold text-slate-900">Daily Stock</h1>
                </div>
                <div className="flex items-center gap-3 no-print">
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand"
                    />
                    <button
                        onClick={() => printRef.current && handlePrint()}
                        className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Print
                    </button>
                </div>
            </div>

            {isLoading || isFetching ? (
                <Loader fullScreen={false} message="Loading daily stock..." />
            ) : (
                <div ref={printRef} className="overflow-x-auto">
                    {/* Print title */}
                    <div className="hidden print:block text-center mb-3">
                        <p className="text-base font-bold">M/S Gazi Traders</p>
                        <p className="text-sm font-bold">Daly Stock</p>
                        <p className="text-xs">DATE: {date.split('-').reverse().join('.')}</p>
                    </div>

                    <div className="rounded-sm border border-slate-200 bg-white shadow-sm">
                        <table className="min-w-full divide-y divide-slate-200 text-xs">
                            <thead>
                                <tr className="bg-slate-100">
                                    <th className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-wide text-slate-600 border-r border-slate-200 whitespace-nowrap">Product Name</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600 border-r border-slate-200 whitespace-nowrap">CNT Size</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600 border-r border-slate-200 whitespace-nowrap">P Stock</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-emerald-700 border-r border-slate-200 whitespace-nowrap">In</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-slate-600 border-r border-slate-200 whitespace-nowrap">Total</th>
                                    {customers.map((c) => (
                                        <th key={c} className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-blue-700 border-r border-slate-200 whitespace-nowrap max-w-[80px] truncate" title={c}>
                                            {c}
                                        </th>
                                    ))}
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-orange-700 border-r border-slate-200 whitespace-nowrap">Delivery</th>
                                    <th className="px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wide text-red-700 whitespace-nowrap">Balance</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {products.length === 0 ? (
                                    <tr>
                                        <td colSpan={5 + customers.length + 2} className="py-10 text-center text-slate-500">
                                            No stock activity found for {date}.
                                        </td>
                                    </tr>
                                ) : products.map((p, idx) => (
                                    <tr key={p._id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                                        <td className="px-3 py-1.5 font-medium text-slate-800 border-r border-slate-100 whitespace-nowrap name-col">
                                            {p.name}
                                        </td>
                                        <td className="px-3 py-1.5 text-center text-slate-600 border-r border-slate-100 whitespace-nowrap">
                                            {p.cartoonSize ?? '—'}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-semibold text-slate-700 border-r border-slate-100">
                                            {p.previousStock}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-semibold text-emerald-700 border-r border-slate-100">
                                            {p.stockIn > 0 ? p.stockIn : ''}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-bold text-slate-900 border-r border-slate-100">
                                            {p.total}
                                        </td>
                                        {customers.map((c) => (
                                            <td key={c} className="px-3 py-1.5 text-center text-blue-800 border-r border-slate-100">
                                                {p.deliveries[c] > 0 ? p.deliveries[c] : ''}
                                            </td>
                                        ))}
                                        <td className="px-3 py-1.5 text-center font-semibold text-orange-700 border-r border-slate-100">
                                            {p.totalDelivery > 0 ? p.totalDelivery : ''}
                                        </td>
                                        <td className="px-3 py-1.5 text-center font-bold text-red-700">
                                            {p.balance}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {products.length > 0 && (
                                <tfoot>
                                    <tr className="bg-slate-100 font-bold">
                                        <td className="px-3 py-2 text-slate-700 border-r border-slate-200">Total</td>
                                        <td className="border-r border-slate-200"></td>
                                        <td className="px-3 py-2 text-center text-slate-700 border-r border-slate-200">
                                            {products.reduce((s, p) => s + p.previousStock, 0)}
                                        </td>
                                        <td className="px-3 py-2 text-center text-emerald-700 border-r border-slate-200">
                                            {products.reduce((s, p) => s + p.stockIn, 0) || ''}
                                        </td>
                                        <td className="px-3 py-2 text-center text-slate-900 border-r border-slate-200">
                                            {products.reduce((s, p) => s + p.total, 0)}
                                        </td>
                                        {customers.map((c) => (
                                            <td key={c} className="px-3 py-2 text-center text-blue-800 border-r border-slate-200">
                                                {products.reduce((s, p) => s + (p.deliveries[c] ?? 0), 0) || ''}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-center text-orange-700 border-r border-slate-200">
                                            {products.reduce((s, p) => s + p.totalDelivery, 0) || ''}
                                        </td>
                                        <td className="px-3 py-2 text-center text-red-700">
                                            {products.reduce((s, p) => s + p.balance, 0)}
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    {/* Summary cards */}
                    {products.length > 0 && (
                        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 no-print">
                            {[
                                { label: 'Opening Stock', value: products.reduce((s, p) => s + p.previousStock, 0), color: 'text-slate-700' },
                                { label: 'Stock In', value: products.reduce((s, p) => s + p.stockIn, 0), color: 'text-emerald-700' },
                                { label: 'Total Delivery', value: products.reduce((s, p) => s + p.totalDelivery, 0), color: 'text-orange-700' },
                                { label: 'Closing Balance', value: products.reduce((s, p) => s + p.balance, 0), color: 'text-red-700' },
                            ].map((c) => (
                                <div key={c.label} className="rounded-sm border border-slate-200 bg-white p-3 shadow-sm">
                                    <p className="text-xs text-slate-500 font-medium">{c.label}</p>
                                    <p className={`text-xl font-bold mt-0.5 ${c.color}`}>{c.value.toLocaleString()}</p>
                                    <p className="text-xs text-slate-400">pieces</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
