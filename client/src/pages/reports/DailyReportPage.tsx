/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import { PrinterIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetOrdersQuery } from '@/services/ordersApi';
import * as XLSX from 'xlsx';
import gaziLogo from '@/assets/gaziLogo.svg';

interface DailySummary {
    totalOrders: number;
    totalAmount: number;
    netAmount: number;
}

const DailyReportPage = () => {
    const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
    const reportRef = useRef<HTMLDivElement>(null);

    const { data: ordersData, isLoading: ordersLoading, isError: ordersError } = useGetOrdersQuery({
        date: selectedDate,
        limit: 10000,
    });

    const orders = useMemo(() => ordersData?.result || [], [ordersData?.result]);

    const orderWiseSales = useMemo(() => {
        return orders.map((order: any) => {
            const orderItems = order.items.map((item: any) => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                categoryName: item.categoryName || 'অন্যান্য',
            }));

            const orderQuantity = orderItems.reduce((sum: number, item: any) => sum + item.quantity, 0);
            const orderAmount = orderItems.reduce((sum: number, item: any) => sum + item.totalPrice, 0);
            const subtotal = order.subtotal ?? orderAmount;
            const discount = order.discount ?? 0;
            const tax = order.tax ?? 0;
            const grandTotal = order.totalAmount ?? (subtotal - discount + tax);
            const paidAmount = order.paidAmount ?? 0;
            const dueAmount = grandTotal - paidAmount;

            return {
                orderId: order._id,
                orderNumber: order.orderNumber,
                customer: order.customer,
                orderDate: order.createdAt,
                items: orderItems,
                orderQuantity,
                orderAmount,
                status: order.status,
                paymentMethod: order.paymentMethod,
                subtotal,
                discount,
                tax,
                grandTotal,
                paidAmount,
                dueAmount,
                notes: order.notes,
            };
        });
    }, [orders]);

    const dailySummary: DailySummary = useMemo(() => {
        const totalAmount = orderWiseSales.reduce((sum, order) => sum + order.grandTotal, 0);
        return {
            totalOrders: orders.length,
            totalAmount,
            netAmount: totalAmount,
        };
    }, [orderWiseSales, orders.length]);

    const reportContent = useMemo(() => (
        <div style={{ fontFamily: 'Arial, sans-serif', padding: '10px', maxWidth: '800px', margin: '0 auto', color: '#000', fontSize: '9px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '1px solid #000', paddingBottom: '8px' }}>
                <img src={gaziLogo} alt="Gazi Traders" style={{ maxWidth: '80px', height: 'auto', display: 'block', margin: '0 auto 5px' }} />
                <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '2px' }}>Daily Report</div>
                <div style={{ fontSize: '9px', color: '#666' }}>Generated on: {dayjs(selectedDate).format('DD/MM/YYYY')}</div>
            </div>

            {orderWiseSales.length > 0 && (
                <div style={{ marginBottom: '10px' }}>
                    <h2 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
                        Daily Sale Report
                    </h2>
                    {orderWiseSales.map((order) => (
                        <div key={order.orderId} style={{ marginBottom: '8px', pageBreakInside: 'avoid' }}>
                            <h3 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>
                                Order: {order.orderNumber} | Customer: {order.customer?.name || 'N/A'} | Date: {dayjs(order.orderDate).format('DD MMM YYYY')}
                            </h3>
                            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', border: '1px solid #ddd', fontSize: '8px' }}>
                                <thead>
                                    <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                        <th style={{ padding: '3px', textAlign: 'left', border: '1px solid #ddd' }}>Product Name</th>
                                        <th style={{ padding: '3px', textAlign: 'center', border: '1px solid #ddd' }}>Qty</th>
                                        <th style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd' }}>Unit Price</th>
                                        <th style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd' }}>Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.items.map((item: any, index: number) => (
                                        <tr key={`${item.productName}-${index}`} style={{ borderBottom: '1px solid #ddd' }}>
                                            <td style={{ padding: '3px', border: '1px solid #ddd' }}>{item.productName || 'N/A'}</td>
                                            <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #ddd' }}>{item.quantity || 0}</td>
                                            <td style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd' }}>৳{(item.unitPrice || 0).toLocaleString()}</td>
                                            <td style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd' }}>৳{(item.totalPrice || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr style={{ backgroundColor: '#f9f9f9', borderTop: '1px solid #000' }}>
                                        <td style={{ padding: '3px', fontWeight: 'bold', border: '1px solid #ddd' }}>Order Total</td>
                                        <td style={{ padding: '3px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd' }}>{order.orderQuantity || 0}</td>
                                        <td style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd' }}>-</td>
                                        <td style={{ padding: '3px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ddd' }}>৳{(order.grandTotal || 0).toLocaleString()}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {orderWiseSales.length > 0 && (
                <div style={{ marginBottom: '8px', padding: '6px', backgroundColor: '#f9f9f9', border: '1px solid #ddd' }}>
                    <h3 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px' }}>Grand Total</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
                        <tbody>
                            <tr style={{ borderTop: '1px solid #000' }}>
                                <td style={{ padding: '3px', fontWeight: 'bold', fontSize: '9px' }}>Total Sales</td>
                                <td style={{ padding: '3px', textAlign: 'right', fontWeight: 'bold', fontSize: '9px' }}>
                                    ৳{dailySummary.totalAmount.toLocaleString()}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            )}

            <div style={{ marginTop: '8px', paddingTop: '4px', borderTop: '1px solid #ccc', textAlign: 'center', fontSize: '7px', color: '#666' }}>
                Powered by : Bytespate Limited
            </div>
        </div>
    ), [selectedDate, orderWiseSales, dailySummary]);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Daily_Report_${dayjs(selectedDate).format('YYYY-MM-DD')}`,
    });

    const handleExport = () => {
        const headers = ['Order Number', 'Customer', 'Date', 'Product Name', 'Quantity', 'Unit Price (৳)', 'Total Price (৳)'];
        const rows: (string | number)[][] = [];

        orderWiseSales.forEach(order => {
            order.items.forEach((item: any) => {
                rows.push([order.orderNumber, order.customer?.name || 'N/A', dayjs(order.orderDate).format('DD/MM/YYYY'), item.productName, item.quantity, item.unitPrice, item.totalPrice]);
            });
            rows.push([order.orderNumber, 'ORDER TOTAL', '-', '-', order.orderQuantity, '-', order.grandTotal]);
            rows.push([]);
        });

        const summaryRows = [
            ['SUMMARY'],
            ['Total Orders', dailySummary.totalOrders, '', '', '', '', dailySummary.totalAmount],
        ];

        const ws = XLSX.utils.aoa_to_sheet([
            [`Daily Report - ${dayjs(selectedDate).format('DD/MM/YYYY')}`],
            [],
            headers,
            ...rows,
            [],
            ...summaryRows,
        ]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');
        XLSX.writeFile(wb, `Daily_Report_${selectedDate}.xlsx`);
    };

    if (ordersLoading) {
        return <Loader fullScreen message="Loading daily report..." />;
    }

    if (ordersError) {
        return <ErrorState description="Unable to load daily report" />;
    }

    return (
        <div className="space-y-8">
            <div ref={reportRef} style={{ display: 'none' }}>{reportContent}</div>

            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Reports</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Daily Report</h1>
                    <p className="text-sm text-slate-500">{dayjs(selectedDate).format('dddd, MMMM DD, YYYY')}</p>
                </div>
                <div className="flex gap-3">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <button onClick={handlePrint} className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                        <PrinterIcon className="h-4 w-4" />
                        Print
                    </button>
                    <button onClick={handleExport} className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <section className="grid gap-6 md:grid-cols-2">
                {[
                    { label: 'Total Orders', value: dailySummary.totalOrders, color: 'blue', icon: '📊', subtitle: `৳${dailySummary.totalAmount.toLocaleString()}` },
                    { label: 'Total Sales', value: `৳${dailySummary.totalAmount.toLocaleString()}`, color: 'green', icon: '💰', subtitle: 'Total sales today' },
                ].map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${card.color === 'green' ? 'text-green-600' : 'text-blue-600'} group-hover:scale-105 transition-transform duration-300`}>
                                    {card.value}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{card.subtitle}</p>
                            </div>
                            <div className={`rounded-sm p-2 ${card.color === 'green' ? 'bg-green-100' : 'bg-blue-100'} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
                                <div className={`h-2 w-2 rounded-sm ${card.color === 'green' ? 'bg-green-500' : 'bg-blue-500'}`}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {/* Daily Sale Report */}
            <div className="rounded-sm border border-white/70 bg-white/90 p-4 shadow-card">
                <h2 className="text-lg font-bold text-slate-900 mb-4">Daily Sale Report</h2>

                {orderWiseSales.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                        <p className="text-lg font-semibold">No orders found for {dayjs(selectedDate).format('DD/MM/YYYY')}</p>
                        <p className="text-sm mt-2">Try selecting a different date.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orderWiseSales.map((order) => (
                            <div key={order.orderId} className="border-b border-slate-200 last:border-0 pb-3 last:pb-0">
                                <div className="mb-2 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900">Order: {order.orderNumber}</h3>
                                        <div className="text-xs text-slate-600 mt-0.5">
                                            Customer: {order.customer?.name || 'N/A'} | Date: {dayjs(order.orderDate).format('DD MMM YYYY')}
                                            {order.paymentMethod && ` | Payment: ${order.paymentMethod.replace('_', ' ')}`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-600">
                                        <span>Qty: <strong>{order.orderQuantity}</strong></span>
                                        <span className="font-bold text-green-600">Total: ৳{order.grandTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-sm">
                                    <table className="min-w-full divide-y divide-slate-200 text-xs">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                {['S/N', 'Product Name', 'Qty', 'Unit Price', 'Total'].map((h) => (
                                                    <th key={h} className={`px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700 border-b border-slate-200 ${h === 'S/N' || h === 'Qty' ? 'text-center' : h === 'Unit Price' || h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200">
                                            {order.items.length > 0 ? order.items.map((item: any, index: number) => (
                                                <tr key={`${item.productName}-${index}`} className="hover:bg-slate-50">
                                                    <td className="px-2 py-1.5 text-center text-slate-400">{index + 1}</td>
                                                    <td className="px-2 py-1.5 font-medium text-xs">{item.productName || 'N/A'}</td>
                                                    <td className="px-2 py-1.5 text-center text-slate-700">{item.quantity || 0}</td>
                                                    <td className="px-2 py-1.5 text-right text-slate-700">৳{(item.unitPrice || 0).toLocaleString()}</td>
                                                    <td className="px-2 py-1.5 text-right font-semibold text-slate-900">৳{(item.totalPrice || 0).toLocaleString()}</td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={5} className="px-2 py-2 text-center text-slate-500 text-xs">No items</td></tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-slate-100 border-t-2 border-slate-300">
                                            <tr className="font-bold text-slate-900 text-xs">
                                                <td className="px-2 py-1.5"></td>
                                                <td className="px-2 py-1.5">Order Summary</td>
                                                <td className="px-2 py-1.5 text-center">{order.orderQuantity || 0}</td>
                                                <td className="px-2 py-1.5 text-right">-</td>
                                                <td className="px-2 py-1.5 text-right">
                                                    {order.discount > 0 && (
                                                        <div className="text-blue-600 text-[9px] font-semibold">Dis: -৳{order.discount.toLocaleString()}</div>
                                                    )}
                                                    <div className={`font-bold ${order.grandTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                                        Net: ৳{(order.grandTotal || 0).toLocaleString()}
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        ))}

                        {/* Grand Total */}
                        <div className="mt-3 border-t-2 border-slate-300 pt-2">
                            <div className="flex justify-end">
                                <div className="text-right space-y-1">
                                    <div className="text-xs text-slate-600 mb-0.5">Grand Total</div>
                                    <div className={`text-base font-bold ${dailySummary.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                        Total Sales: ৳{dailySummary.totalAmount.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-1">
                                        {orderWiseSales.reduce((sum, o) => sum + o.orderQuantity, 0)} items from {dailySummary.totalOrders} orders
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Daily Summary */}
            <div className="rounded-sm border border-white/70 bg-linear-to-r from-blue-50 to-indigo-50 p-4 shadow-card">
                <h3 className="text-base font-bold text-slate-900 mb-3">Daily Summary</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                    <div className="text-center">
                        <p className="text-xs text-slate-600">Total Orders</p>
                        <p className="text-lg font-bold text-slate-900">{dailySummary.totalOrders}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-slate-600">Total Sales</p>
                        <p className="text-xl font-bold text-green-600">৳{dailySummary.totalAmount.toLocaleString()}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DailyReportPage;
