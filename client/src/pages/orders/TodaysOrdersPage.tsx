/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useMemo } from 'react';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import {
    PrinterIcon,
    ArrowDownTrayIcon
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetOrdersQuery } from '@/services/ordersApi';
import * as XLSX from 'xlsx';
import gaziLogo from '@/assets/gaziLogo.svg';

interface DailySummary {
    totalOrders: number;
    totalAmount: number;
}

const TodaysOrdersPage = () => {
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
            const grandTotal = order.totalAmount ?? orderAmount;
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
                subtotal: order.subtotal ?? orderAmount,
                discount: order.discount ?? 0,
                tax: order.tax ?? 0,
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
        };
    }, [orderWiseSales, orders.length]);

    const reportContent = useMemo(() => {
        return (
            <div style={{ fontFamily: 'Arial, sans-serif', padding: '10px', maxWidth: '800px', margin: '0 auto', color: '#000', fontSize: '9px' }}>
                <div style={{ textAlign: 'center', marginBottom: '10px', borderBottom: '1px solid #000', paddingBottom: '8px', backgroundColor: '#ffffff' }}>
                    <div style={{ display: 'inline-block', backgroundColor: '#ffffff', padding: '5px', borderRadius: '4px', marginBottom: '5px' }}>
                        <img src={gaziLogo} alt="Gazi Traders Logo" style={{ maxWidth: '80px', height: 'auto', display: 'block', backgroundColor: '#ffffff' }} />
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '2px' }}>Today's Orders Report</div>
                    <div style={{ fontSize: '10px', marginBottom: '2px' }}>Daily Report</div>
                    <div style={{ fontSize: '9px', color: '#666' }}>Generated on: {dayjs(selectedDate).format('DD/MM/YYYY')}</div>
                </div>

                {orderWiseSales.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                        <h2 style={{ fontSize: '11px', fontWeight: 'bold', marginBottom: '6px', borderBottom: '1px solid #ccc', paddingBottom: '2px' }}>
                            Daily Sale Report
                        </h2>
                        {orderWiseSales.map((order) => (
                            <div key={order.orderId} style={{ marginBottom: '8px', pageBreakInside: 'avoid' }}>
                                <h3 style={{ fontSize: '10px', fontWeight: 'bold', marginBottom: '4px', color: '#333' }}>
                                    Order: {order.orderNumber} | Customer: {order.customer?.name || 'N/A'} | Date: {dayjs(order.orderDate).format('DD MMM YYYY')}
                                </h3>
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px', border: '1px solid #ddd', fontSize: '8px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#f5f5f5', borderBottom: '1px solid #000' }}>
                                            <th style={{ padding: '3px', textAlign: 'left', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '8px' }}>Product Name</th>
                                            <th style={{ padding: '3px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '8px' }}>Qty</th>
                                            <th style={{ padding: '3px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '8px' }}>Unit Price</th>
                                            <th style={{ padding: '3px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '8px' }}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {order.items.map((item: any, index: number) => (
                                            <tr key={`${item.productName}-${index}`} style={{ borderBottom: '1px solid #ddd' }}>
                                                <td style={{ padding: '3px', border: '1px solid #ddd', fontSize: '8px' }}>{item.productName || 'N/A'}</td>
                                                <td style={{ padding: '3px', textAlign: 'center', border: '1px solid #ddd', fontSize: '8px' }}>{item.quantity || 0}</td>
                                                <td style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd', fontSize: '8px' }}>৳{(item.unitPrice || 0).toLocaleString()}</td>
                                                <td style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd', fontSize: '8px' }}>৳{(item.totalPrice || 0).toLocaleString()}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr style={{ backgroundColor: '#f9f9f9', borderTop: '1px solid #000' }}>
                                            <td style={{ padding: '3px', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '8px' }}>Order Total</td>
                                            <td style={{ padding: '3px', textAlign: 'center', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '8px' }}>{order.orderQuantity || 0}</td>
                                            <td style={{ padding: '3px', textAlign: 'right', border: '1px solid #ddd', fontSize: '8px' }}>-</td>
                                            <td style={{ padding: '3px', textAlign: 'right', fontWeight: 'bold', border: '1px solid #ddd', fontSize: '8px' }}>৳{(order.grandTotal || 0).toLocaleString()}</td>
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
        );
    }, [selectedDate, orderWiseSales, dailySummary]);

    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Todays_Orders_${dayjs(selectedDate).format('YYYY-MM-DD')}`,
    });

    const handleExport = () => {
        const headers = ['Order Number', 'Customer', 'Date', 'Product Name', 'Quantity', 'Unit Price (৳)', 'Total Price (৳)'];
        const rows: (string | number)[][] = [];

        orderWiseSales.forEach(order => {
            order.items.forEach((item: any) => {
                rows.push([
                    order.orderNumber,
                    order.customer?.name || 'N/A',
                    dayjs(order.orderDate).format('DD/MM/YYYY'),
                    item.productName,
                    item.quantity,
                    item.unitPrice,
                    item.totalPrice,
                ]);
            });
            rows.push([order.orderNumber, 'ORDER TOTAL', '-', '-', order.orderQuantity, '-', order.grandTotal]);
            rows.push([]);
        });

        const summaryRows = [
            ['SUMMARY'],
            ['Total Orders', dailySummary.totalOrders, '', '', '', '', dailySummary.totalAmount],
        ];

        const wsData = [
            [`Today's Orders Report - ${dayjs(selectedDate).format('DD/MM/YYYY')}`],
            [],
            headers,
            ...rows,
            [],
            ...summaryRows
        ];

        const ws = XLSX.utils.aoa_to_sheet(wsData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Daily Report');
        XLSX.writeFile(wb, `Daily_Report_${selectedDate}.xlsx`);
    };

    if (ordersLoading) {
        return <Loader fullScreen message="Loading today's orders..." />;
    }

    if (ordersError) {
        return <ErrorState description="Unable to load today's orders" />;
    }

    return (
        <div className="space-y-8 print:space-y-4">
            <div ref={reportRef} style={{ display: 'none' }}>
                {reportContent}
            </div>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:flex-row">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand print:text-black">
                        Daily Report
                    </p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900 print:text-2xl">
                        Today's Orders
                    </h1>
                    <p className="text-sm text-slate-500 print:text-black">
                        {dayjs(selectedDate).format('dddd, MMMM DD, YYYY')}
                    </p>
                </div>
                <div className="flex gap-3 print:hidden">
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="rounded-sm border border-slate-200 px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                    />
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Print
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <section className="grid gap-6 md:grid-cols-2 print:grid-cols-2 print:gap-2">
                {[
                    {
                        label: 'Total Orders',
                        value: dailySummary.totalOrders,
                        color: 'blue',
                        icon: '📊',
                        subtitle: `৳${dailySummary.totalAmount.toLocaleString()}`
                    },
                    {
                        label: 'Total Amount',
                        value: `৳${dailySummary.totalAmount.toLocaleString()}`,
                        color: 'green',
                        icon: '💰',
                        subtitle: 'Total sales today'
                    },
                ].map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1 print:shadow-none print:border-slate-300 print:p-2">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500 print:text-black">{card.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${card.color === 'green' ? 'text-green-600' : 'text-blue-600'} group-hover:scale-105 transition-transform duration-300 print:text-black print:text-sm`}>
                                    {card.value}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mt-1 print:text-[7px] print:text-black">{card.subtitle}</p>
                            </div>
                            <div className={`rounded-sm p-2 ${card.color === 'green' ? 'bg-green-100' : 'bg-blue-100'} opacity-60 group-hover:opacity-100 transition-opacity duration-300 print:bg-gray-100 print:p-1`}>
                                <div className={`h-2 w-2 rounded-sm ${card.color === 'green' ? 'bg-green-500' : 'bg-blue-500'} print:bg-black`}></div>
                            </div>
                        </div>
                    </div>
                ))}
            </section>

            {/* Order-wise Sales */}
            <div className="rounded-sm border border-white/70 bg-white/90 p-4 shadow-card print:shadow-none print:border-slate-300 print:p-2">
                <h2 className="text-lg font-bold text-slate-900 mb-4 print:text-xs print:mb-2">Daily Sale Report</h2>

                {orderWiseSales.length === 0 ? (
                    <div className="py-8 text-center text-slate-500">
                        {orders.length > 0 ? (
                            <div>
                                <p className="font-semibold text-slate-700 mb-2">Found {orders.length} orders but no item information available.</p>
                                <div className="mt-4 overflow-x-auto">
                                    <table className="min-w-full divide-y divide-slate-100 text-sm">
                                        <thead className="bg-slate-50">
                                            <tr>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">S/N</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Order #</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold uppercase">Items</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold uppercase">Total Amount</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {orders.map((order, idx) => (
                                                <tr key={order._id} className="hover:bg-slate-50">
                                                    <td className="px-4 py-3 text-slate-400 text-xs">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                                                    <td className="px-4 py-3">
                                                        {order.items?.map((item: any, i: number) => (
                                                            <div key={i} className="text-sm">
                                                                {item.productName} (Qty: {item.quantity}) - ৳{item.totalPrice?.toLocaleString()}
                                                            </div>
                                                        ))}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold">
                                                        ৳{order.totalAmount?.toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ) : (
                            <div>
                                <p className="text-lg font-semibold">No orders found for {dayjs(selectedDate).format('DD/MM/YYYY')}</p>
                                <p className="text-sm mt-2">Try selecting a different date or create a new order.</p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-4 print:space-y-2">
                        {orderWiseSales.map((order) => (
                            <div key={order.orderId} className="border-b border-slate-200 last:border-0 pb-3 last:pb-0 print:pb-1 print:page-break-inside-avoid">
                                <div className="mb-2 print:mb-1 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 print:text-[10px]">
                                            Order: {order.orderNumber}
                                        </h3>
                                        <div className="text-xs print:text-[8px] text-slate-600 print:text-black mt-0.5">
                                            Customer: {order.customer?.name || 'N/A'} | Date: {dayjs(order.orderDate).format('DD MMM YYYY')}
                                            {order.paymentMethod && ` | Payment: ${order.paymentMethod.replace('_', ' ')}`}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs print:text-[8px] text-slate-600 print:text-black">
                                        <span>Qty: <strong>{order.orderQuantity}</strong></span>
                                        <span className="font-bold text-green-600">
                                            Total: ৳{order.grandTotal.toLocaleString()}
                                        </span>
                                    </div>
                                </div>

                                <div className="overflow-x-auto border border-slate-200 rounded-sm print:border-slate-300">
                                    <table className="min-w-full divide-y divide-slate-200 text-xs print:text-[9px]">
                                        <thead className="bg-slate-50 print:bg-white">
                                            <tr>
                                                {['S/N', 'Product Name', 'Qty', 'Unit Price', 'Total'].map(h => (
                                                    <th key={h} className={`px-2 py-1.5 text-[9px] font-semibold uppercase tracking-wider text-slate-700 print:text-black border-b border-slate-200 ${h === 'S/N' || h === 'Qty' ? 'text-center' : h === 'Unit Price' || h === 'Total' ? 'text-right' : 'text-left'}`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-slate-200 print:bg-white">
                                            {order.items.length > 0 ? (
                                                order.items.map((item: any, index: number) => (
                                                    <tr key={`${item.productName}-${index}`} className="hover:bg-slate-50 print:hover:bg-transparent">
                                                        <td className="px-2 py-1.5 text-center text-slate-400 text-xs print:text-[9px]">{index + 1}</td>
                                                        <td className="px-2 py-1.5 print:text-black font-medium text-xs print:text-[9px]">{item.productName || 'N/A'}</td>
                                                        <td className="px-2 py-1.5 text-center text-slate-700 print:text-black text-xs print:text-[9px]">{item.quantity || 0}</td>
                                                        <td className="px-2 py-1.5 text-right text-slate-700 print:text-black text-xs print:text-[9px]">৳{(item.unitPrice || 0).toLocaleString()}</td>
                                                        <td className="px-2 py-1.5 text-right font-semibold text-slate-900 print:text-black text-xs print:text-[9px]">৳{(item.totalPrice || 0).toLocaleString()}</td>
                                                    </tr>
                                                ))
                                            ) : (
                                                <tr>
                                                    <td colSpan={5} className="px-2 py-2 text-center text-slate-500 text-xs print:text-[9px]">
                                                        No items found in this order
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                        <tfoot className="bg-slate-100 print:bg-white border-t-2 border-slate-300">
                                            <tr className="font-bold text-slate-900 print:text-black text-xs print:text-[9px]">
                                                <td className="px-2 py-1.5"></td>
                                                <td className="px-2 py-1.5">Order Summary</td>
                                                <td className="px-2 py-1.5 text-center">{order.orderQuantity || 0}</td>
                                                <td className="px-2 py-1.5 text-right">-</td>
                                                <td className="px-2 py-1.5 text-right">
                                                    <div className="space-y-0.5">
                                                        {order.discount > 0 && (
                                                            <div className="text-blue-600 text-[9px] print:text-[8px] font-semibold">
                                                                Dis: -৳{order.discount.toLocaleString()}
                                                            </div>
                                                        )}
                                                        <div className="text-xs print:text-[9px] font-bold text-green-600">
                                                            Net: ৳{(order.grandTotal || 0).toLocaleString()}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        ))}

                        {/* Grand Total */}
                        <div className="mt-3 print:mt-1 border-t-2 border-slate-300 pt-2 print:pt-1">
                            <div className="flex justify-end">
                                <div className="text-right space-y-1 print:space-y-0.5">
                                    <div className="text-xs print:text-[8px] text-slate-600 print:text-black mb-0.5">Grand Total</div>
                                    <div className="text-base print:text-[10px] font-bold text-green-600 print:text-black">
                                        Total: ৳{dailySummary.totalAmount.toLocaleString()}
                                    </div>
                                    <div className="text-[10px] print:text-[7px] text-slate-500 print:text-black mt-1">
                                        {orderWiseSales.reduce((sum, order) => sum + order.orderQuantity, 0)} items from {dailySummary.totalOrders} orders
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Daily Summary */}
            <div className="rounded-sm border border-white/70 bg-linear-to-r from-blue-50 to-indigo-50 p-4 shadow-card print:shadow-none print:border-slate-300 print:bg-white print:p-2">
                <h3 className="text-base font-bold text-slate-900 mb-3 print:text-[10px] print:mb-1">Daily Summary</h3>
                <div className="grid gap-3 sm:grid-cols-2 print:grid-cols-2 print:gap-1">
                    <div className="text-center">
                        <p className="text-xs print:text-[8px] text-slate-600 print:text-black">Total Orders</p>
                        <p className="text-lg print:text-[9px] font-bold text-slate-900 print:text-black">{dailySummary.totalOrders}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs print:text-[8px] text-slate-600 print:text-black">Total Sales</p>
                        <p className="text-xl print:text-[10px] font-bold text-green-600 print:text-black">৳{dailySummary.totalAmount.toLocaleString()}</p>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    @page { size: A4; margin: 10mm; }
                    .no-print { display: none !important; }
                    div[style*="display: none"] { display: block !important; }
                    * { font-size: 9px !important; }
                    h1, h2, h3 { font-size: 10px !important; margin-bottom: 4px !important; }
                    table { font-size: 8px !important; }
                    th, td { padding: 2px 4px !important; }
                }
            `}</style>
        </div>
    );
};

export default TodaysOrdersPage;
