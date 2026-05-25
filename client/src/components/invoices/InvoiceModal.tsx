import { useEffect, useRef } from 'react';
import { useGetOrderByIdQuery } from '@/services/ordersApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import dayjs from 'dayjs';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useReactToPrint } from 'react-to-print';
import gaziLogo from '@/assets/gaziLogo.svg';

interface InvoiceModalProps {
    orderId: string;
    onClose: () => void;
}

const InvoiceModal = ({ orderId, onClose }: InvoiceModalProps) => {
    const { data: order, isLoading, isError } = useGetOrderByIdQuery(orderId);
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Invoice_${order?.orderNumber || 'Document'}`,
    });

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-4xl rounded-sm bg-white p-8 shadow-2xl h-[90vh] flex items-center justify-center">
                    <Loader message="Loading invoice..." />
                </div>
            </div>
        );
    }

    if (isError || !order) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-2xl">
                    <ErrorState description="Invoice not found" />
                    <button
                        onClick={onClose}
                        className="mt-4 w-full rounded-sm bg-brand px-4 py-3 text-sm font-semibold text-white"
                    >
                        Close
                    </button>
                </div>
            </div>
        );
    }

    const paidAmount = order.status === 'completed' ? order.totalAmount : (order.paidAmount ?? 0);
    const dueAmount = order.totalAmount - paidAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl rounded-sm bg-white shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-900">
                        Invoice Details
                        <span className="ml-3 text-sm font-normal text-slate-500">#{order.orderNumber}</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handlePrint()}
                            className="inline-flex items-center gap-2 rounded-sm bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/20 transition-colors"
                        >
                            <PrinterIcon className="h-5 w-5" />
                            Print Invoice
                        </button>
                        <button
                            onClick={onClose}
                            className="rounded-sm p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors"
                        >
                            <XMarkIcon className="h-6 w-6" />
                        </button>
                    </div>
                </div>

                {/* Modal Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-8 bg-slate-100">
                    <div className="mx-auto max-w-3xl bg-white shadow-sm p-8" ref={printRef}>
                        {/* Header */}
                        <div className="border-b-2 border-slate-900 pb-6 mb-6">
                            <div className="flex justify-between items-start">
                                <div className="text-sm">
                                    <img
                                        src={gaziLogo}
                                        alt="Gazi Traders Logo"
                                        className="h-12 w-auto mb-2"
                                    />
                                    <h1 className="text-2xl font-bold text-slate-900">INVOICE</h1>
                                    <p className="text-sm text-slate-600 mt-1">গাজী ট্রেডার্স</p>
                                    <p className="text-xs text-slate-500">Inventory Management System</p>
                                </div>
                                <div className="text-right text-sm">
                                    <p className="text-lg font-bold text-brand">{order.orderNumber}</p>
                                    <p className="text-xs text-slate-600 mt-1">
                                        Date: {dayjs(order.createdAt).format('DD MMM YYYY')}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                        <p className="text-[10px] font-bold text-slate-900 uppercase tracking-wide mb-1">
                                            Bill To:
                                        </p>
                                        <div className="text-slate-700 text-[10px]">
                                            <p className="font-semibold">{order.customer?.name ?? 'Walk-in'}</p>
                                            {order.customer?.phone && <p className="mt-0.5">Phone: {order.customer.phone}</p>}
                                            {order.customer?.email && <p className="mt-0.5">Email: {order.customer.email}</p>}
                                            {order.customer?.address && <p className="mt-0.5">Address: {order.customer.address}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-6 text-xs">
                            <thead>
                                <tr className="border-b-2 border-slate-900">
                                    <th className="text-center py-2 px-1.5 text-[10px] font-bold text-slate-900 uppercase" style={{ width: '32px' }}>
                                        S/N
                                    </th>
                                    <th className="text-left py-2 px-1.5 text-[10px] font-bold text-slate-900 uppercase">
                                        Item
                                    </th>
                                    <th className="text-center py-2 px-1.5 text-[10px] font-bold text-slate-900 uppercase">
                                        Quantity
                                    </th>
                                    <th className="text-right py-2 px-1.5 text-[10px] font-bold text-slate-900 uppercase">
                                        Unit Price
                                    </th>
                                    <th className="text-right py-2 px-1.5 text-[10px] font-bold text-slate-900 uppercase">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {order.items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200">
                                        <td className="py-2 px-1.5 text-center font-medium text-slate-700">{index + 1}</td>
                                        <td className="py-2 px-1.5 text-slate-800">{item.productName}</td>
                                        <td className="py-2 px-1.5 text-center text-slate-700">{item.quantity}</td>
                                        <td className="py-2 px-1.5 text-right text-slate-700">
                                            ৳{item.unitPrice.toLocaleString()}
                                        </td>
                                        <td className="py-2 px-1.5 text-right font-semibold text-slate-900">
                                            ৳{item.totalPrice.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end mb-6">
                            <div className="w-64 text-xs">
                                <div className="flex justify-between py-1.5 text-slate-700 border-b border-slate-200">
                                    <span className="font-medium">Subtotal:</span>
                                    <span className="font-semibold">৳{(order.subtotal ?? order.totalAmount).toLocaleString()}</span>
                                </div>

                                {(order.discount ?? 0) > 0 && (
                                    <div className="flex justify-between py-1.5 text-slate-700">
                                        <span>Discount:</span>
                                        <span className="font-semibold text-orange-600">
                                            -৳{(order.discount ?? 0).toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                {(order.tax ?? 0) > 0 && (
                                    <div className="flex justify-between py-1.5 text-slate-700">
                                        <span>Tax:</span>
                                        <span className="font-semibold">+৳{(order.tax ?? 0).toLocaleString()}</span>
                                    </div>
                                )}

                                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-bold">
                                    <span>TOTAL:</span>
                                    <span className="text-brand">৳{order.totalAmount.toLocaleString()}</span>
                                </div>

                                <div className="border-t border-slate-200 pt-2 mt-2 space-y-1.5">
                                    <div className="flex justify-between text-slate-700">
                                        <span className="font-medium">Paid Amount:</span>
                                        <span className={
                                            order.status === 'completed' ? 'font-semibold text-emerald-600' :
                                                order.status === 'partial' ? 'font-semibold text-blue-600' :
                                                    'text-slate-500'
                                        }>
                                            ৳{paidAmount.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-slate-700">
                                        <span className="font-medium">Due Amount:</span>
                                        <span className={`font-semibold ${dueAmount > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                                            ৳{dueAmount.toLocaleString()}
                                        </span>
                                    </div>

                                    <div className="flex justify-between text-slate-700 pt-1.5 border-t border-slate-200">
                                        <span className="font-medium">Status:</span>
                                        <span className={`inline-flex items-center rounded-sm px-2 py-0.5 text-[10px] font-semibold capitalize ${order.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
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
                        <div className="border-t border-slate-200 pt-4 mb-6 text-xs">
                            <div className="grid grid-cols-2 gap-4">
                                {order.paymentMethod && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-900 uppercase mb-1">
                                            Payment Method
                                        </h3>
                                        <p className="text-slate-700 capitalize">{order.paymentMethod.replace('_', ' ')}</p>
                                    </div>
                                )}
                                {order.notes && (
                                    <div>
                                        <h3 className="text-[10px] font-bold text-slate-900 uppercase mb-1">Notes</h3>
                                        <p className="text-slate-700">{order.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-500">
                            <p>Thank you for your business!</p>
                            <p className="mt-1">Powered by: Bytespate Limited</p>
                        </div>
                    </div>
                </div>

                <style>{`
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                        @page { margin: 1cm; }
                    }
                `}</style>
            </div>
        </div>
    );
};

export default InvoiceModal;
