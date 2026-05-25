import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetOrderByIdQuery } from '@/services/ordersApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import dayjs from 'dayjs';
import { ChevronLeftIcon } from '@heroicons/react/24/outline';
import gaziLogo from '@/assets/gaziLogo.svg';

const PrintInvoicePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: order, isLoading, isError } = useGetOrderByIdQuery(id!);

    useEffect(() => {
        if (order) {
            // Auto print when loaded
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [order]);

    if (isLoading) return <Loader fullScreen message="Loading invoice..." />;
    if (isError || !order) return <ErrorState description="Invoice not found" />;

    return (
        <div className="min-h-screen bg-white p-8">
            <div className="max-w-4xl mx-auto print:hidden mb-6">
                <button
                    onClick={() => navigate(-1)}
                    className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                >
                    <ChevronLeftIcon className="h-4 w-4" />
                    Back
                </button>
            </div>
            <div className="max-w-4xl mx-auto">
                {/* Header */}
                <div className="border-b-2 border-slate-900 pb-6 mb-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <img 
                                src={gaziLogo} 
                                alt="Gazi Traders Logo" 
                                className="h-16 w-auto mb-3"
                            />
                            <h1 className="text-4xl font-bold text-slate-900">INVOICE</h1>
                            <p className="text-lg text-slate-600 mt-2">গাজী ট্রেডার্স</p>
                            <p className="text-sm text-slate-500">Inventory Management System</p>
                        </div>
                        <div className="text-right">
                            <p className="text-2xl font-bold text-brand">{order.orderNumber}</p>
                            <p className="text-sm text-slate-600 mt-2">
                                Date: {dayjs(order.createdAt).format('DD MMM YYYY')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Bill To */}
                <div className="mb-8">
                    <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
                        Bill To:
                    </h2>
                    <div className="text-slate-700">
                        <p className="font-semibold text-lg">{order.customer.name}</p>
                        {order.customer.phone && <p className="text-sm">Phone: {order.customer.phone}</p>}
                        {order.customer.email && <p className="text-sm">Email: {order.customer.email}</p>}
                        {order.customer.address && <p className="text-sm">Address: {order.customer.address}</p>}
                    </div>
                </div>

                {/* Items Table */}
                <table className="w-full mb-8">
                    <thead>
                        <tr className="border-b-2 border-slate-900">
                            <th className="text-center py-3 px-2 text-sm font-bold text-slate-900 uppercase" style={{ width: '40px' }}>
                                S/N
                            </th>
                            <th className="text-left py-3 px-2 text-sm font-bold text-slate-900 uppercase">
                                Item
                            </th>
                            <th className="text-center py-3 px-2 text-sm font-bold text-slate-900 uppercase">
                                Quantity
                            </th>
                            <th className="text-right py-3 px-2 text-sm font-bold text-slate-900 uppercase">
                                Unit Price
                            </th>
                            <th className="text-right py-3 px-2 text-sm font-bold text-slate-900 uppercase">
                                Total
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {order.items.map((item, index) => (
                            <tr key={index} className="border-b border-slate-200">
                                <td className="py-3 px-2 text-center font-medium text-slate-700">{index + 1}</td>
                                <td className="py-3 px-2 text-slate-800">{item.productName}</td>
                                <td className="py-3 px-2 text-center text-slate-700">{item.quantity}</td>
                                <td className="py-3 px-2 text-right text-slate-700">
                                    ৳{item.unitPrice.toLocaleString()}
                                </td>
                                <td className="py-3 px-2 text-right font-semibold text-slate-900">
                                    ৳{item.totalPrice.toLocaleString()}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals */}
                <div className="flex justify-end mb-8">
                    <div className="w-64">
                        <div className="flex justify-between py-2 text-slate-700">
                            <span>Subtotal:</span>
                            <span className="font-semibold">৳{(order.subtotal ?? 0).toLocaleString()}</span>
                        </div>
                        {(order.discount ?? 0) > 0 && (
                            <div className="flex justify-between py-2 text-slate-700">
                                <span>Discount:</span>
                                <span className="font-semibold text-danger">
                                    -৳{(order.discount ?? 0).toLocaleString()}
                                </span>
                            </div>
                        )}
                        {(order.tax ?? 0) > 0 && (
                            <div className="flex justify-between py-2 text-slate-700">
                                <span>Tax:</span>
                                <span className="font-semibold">৳{(order.tax ?? 0).toLocaleString()}</span>
                            </div>
                        )}
                        <div className="flex justify-between py-3 border-t-2 border-slate-900 text-lg font-bold">
                            <span>TOTAL:</span>
                            <span className="text-brand">৳{order.totalAmount.toLocaleString()}</span>
                        </div>

                        {/* Payment Status */}
                        <div className="border-t border-slate-200 pt-2 mt-2 space-y-2">
                            <div className="flex justify-between text-slate-700">
                                <span className="font-medium">Paid Amount:</span>
                                <span className={
                                    order.status === 'completed' ? 'font-semibold text-emerald-600' :
                                        order.status === 'partial' ? 'font-semibold text-blue-600' :
                                            'text-slate-500'
                                }>
                                    ৳{(order.status === 'completed' ? order.totalAmount : (order.paidAmount ?? 0)).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-700">
                                <span className="font-medium">Due Amount:</span>
                                <span className="font-semibold text-slate-900">
                                    ৳{(order.totalAmount - (order.status === 'completed' ? order.totalAmount : (order.paidAmount ?? 0))).toLocaleString()}
                                </span>
                            </div>
                            <div className="flex justify-between text-slate-700 mt-2">
                                <span className="font-medium">Status:</span>
                                <span className={`inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold capitalize ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                    order.status === 'partial' ? 'bg-blue-100 text-blue-800' :
                                        'bg-amber-100 text-amber-800'
                                    }`}>
                                    {order.status}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Payment & Notes */}
                <div className="border-t border-slate-200 pt-6 mb-8">
                    <div className="grid grid-cols-2 gap-6">
                        {order.paymentMethod && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">
                                    Payment Method
                                </h3>
                                <p className="text-slate-700 capitalize">{order.paymentMethod.replace('_', ' ')}</p>
                            </div>
                        )}
                        {order.notes && (
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 uppercase mb-2">Notes</h3>
                                <p className="text-slate-700">{order.notes}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-slate-200 pt-6 text-center text-sm text-slate-500">
                    <p>Thank you for your business!</p>
                    <p className="mt-2">Powered by: Bytespate Limited</p>
                </div>
            </div>

            {/* Print Styles */}
            <style>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page {
                        margin: 1cm;
                    }
                }
            `}</style>
        </div>
    );
};

export default PrintInvoicePage;

