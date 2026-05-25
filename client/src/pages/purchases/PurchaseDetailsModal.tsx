import { useRef, useEffect } from 'react';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetPurchaseByIdQuery } from '@/services/purchasesApi';
import gaziLogo from '@/assets/gaziLogo.svg';

interface PurchaseDetailsModalProps {
    purchaseId: string | null;
    onClose: () => void;
}

const PurchaseDetailsModal = ({ purchaseId, onClose }: PurchaseDetailsModalProps) => {
    const { data: purchase, isLoading, isError } = useGetPurchaseByIdQuery(purchaseId || '', { skip: !purchaseId });
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Purchase-${purchase?.purchaseNumber || purchaseId}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 15mm;
            }
            @media print {
                body {
                    -webkit-print-color-adjust: exact;
                    print-color-adjust: exact;
                }
                table {
                    page-break-inside: auto;
                }
                tr {
                    page-break-inside: avoid;
                    page-break-after: auto;
                }
            }
        `,
    });

    // Handle escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!purchaseId) return null;

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-4xl rounded-sm bg-white p-8 shadow-2xl h-[90vh] flex items-center justify-center">
                    <Loader message="Loading purchase details..." />
                </div>
            </div>
        );
    }

    if (isError || !purchase) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-2xl">
                    <ErrorState description="Purchase not found" />
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

    // Debug: Log purchase items to check data
    console.log('Purchase Data:', purchase);
    console.log('Purchase Items:', purchase.items);

    const subtotal = purchase.subtotal ?? purchase.totalAmount;
    const discount = purchase.discount ?? 0;
    const tax = purchase.tax ?? 0;
    const additionalCharges = purchase.additionalCharges ?? 0;
    const grandTotal = purchase.totalAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl rounded-sm bg-white shadow-2xl overflow-hidden flex flex-col h-[90vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
                    <h3 className="text-xl font-bold text-slate-900">
                        Purchase Details
                        <span className="ml-3 text-sm font-normal text-slate-500">#{purchase.purchaseNumber}</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handlePrint()}
                            className="inline-flex items-center gap-2 rounded-sm bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/20 transition-colors"
                        >
                            <PrinterIcon className="h-5 w-5" />
                            Print Purchase
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
                    <div className="mx-auto max-w-3xl bg-white shadow-sm p-6" ref={printRef}>
                        {/* Purchase Content - Purchase From on right below order/date */}
                        <div className="border-b-2 border-slate-900 pb-3 mb-3">
                            <div className="flex justify-between items-start gap-4">
                                <div>
                                    <img
                                        src={gaziLogo}
                                        alt="Gazi Traders Logo"
                                        className="h-10 w-auto mb-1.5"
                                    />
                                    <h1 className="text-2xl font-bold text-slate-900">PURCHASE</h1>
                                    <p className="text-sm text-slate-600 mt-0.5">গাজী ট্রেডার্স</p>
                                    <p className="text-[10px] text-slate-500">Inventory Management System</p>
                                </div>
                                <div className="text-right shrink-0">
                                    <p className="text-lg font-bold text-brand">{purchase.purchaseNumber}</p>
                                    <p className="text-[10px] text-slate-600 mt-0.5">
                                        Date: {dayjs(purchase.createdAt).format('DD MMM YYYY')}
                                    </p>
                                    <div className="mt-2 pt-2 border-t border-slate-200">
                                        <h2 className="text-[9px] font-bold text-slate-900 uppercase tracking-wide mb-1">
                                            Purchase From:
                                        </h2>
                                        <div className="text-slate-700">
                                            <p className="font-semibold text-[10px]">{purchase.supplier.name}</p>
                                            {purchase.supplier.contactPerson && (
                                                <p className="text-[9px]">Contact: {purchase.supplier.contactPerson}</p>
                                            )}
                                            {purchase.supplier.phone && <p className="text-[9px]">Phone: {purchase.supplier.phone}</p>}
                                            {purchase.supplier.email && <p className="text-[9px]">Email: {purchase.supplier.email}</p>}
                                            {purchase.supplier.address && <p className="text-[9px]">Address: {purchase.supplier.address}</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Items Table */}
                        <table className="w-full mb-4 text-[10px]">
                            <thead>
                                <tr className="border-b-2 border-slate-900">
                                    <th className="text-left py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight">S/N</th>
                                    <th className="text-left py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight">
                                        Item
                                    </th>
                                    <th className="text-left py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight">
                                        Supplier
                                    </th>
                                    <th className="text-center py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight">
                                        Qty
                                    </th>
                                    <th className="text-right py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight leading-tight">
                                        Purchase<br />Price
                                    </th>
                                    <th className="text-center py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight leading-tight">
                                        Markup<br />%
                                    </th>
                                    <th className="text-right py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight leading-tight">
                                        Selling<br />Price
                                    </th>
                                    <th className="text-right py-1.5 px-1 text-[9px] font-bold text-slate-900 uppercase tracking-tight">
                                        Total
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchase.items.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200">
                                        <td className="py-1.5 px-1 text-[10px] text-slate-800">{index + 1}</td>
                                        <td className="py-1.5 px-1 text-[10px] text-slate-800">{item.productName}</td>
                                        <td className="py-1.5 px-1 text-[10px] text-slate-700">{purchase.supplier.name}</td>
                                        <td className="py-1.5 px-1 text-center text-[10px] text-slate-700">{item.quantity}</td>
                                        <td className="py-1.5 px-1 text-right text-[10px] text-slate-700">
                                            ৳{item.unitPrice.toLocaleString()}
                                        </td>
                                        <td className="py-1.5 px-1 text-center text-[10px]">
                                            {item.markupPercent !== undefined && item.markupPercent !== null ? (
                                                <span className="text-green-700 font-medium">
                                                    {Number(item.markupPercent).toFixed(2)}%
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-1 text-right text-[10px]">
                                            {item.sellingPrice !== undefined && item.sellingPrice !== null ? (
                                                <span className="text-brand font-semibold">
                                                    ৳{Number(item.sellingPrice).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400">-</span>
                                            )}
                                        </td>
                                        <td className="py-1.5 px-1 text-right font-semibold text-[10px] text-slate-900">
                                            ৳{item.totalPrice.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Totals */}
                        <div className="flex justify-end mb-4">
                            <div className="w-56">
                                {/* Subtotal */}
                                <div className="flex justify-between py-1 text-[10px] text-slate-700 border-b border-slate-200">
                                    <span className="font-medium">Subtotal:</span>
                                    <span className="font-semibold">৳{subtotal.toLocaleString()}</span>
                                </div>

                                {/* Tax */}
                                {tax > 0 && (
                                    <div className="flex justify-between py-1 text-[10px] text-slate-700">
                                        <span>Tax:</span>
                                        <span className="font-semibold">+৳{tax.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* Additional Charges */}
                                {additionalCharges > 0 && (
                                    <div className="flex justify-between py-1 text-[10px] text-slate-700">
                                        <span>Additional Charges:</span>
                                        <span className="font-semibold">+৳{additionalCharges.toLocaleString()}</span>
                                    </div>
                                )}

                                {/* Discount */}
                                {discount > 0 && (
                                    <div className="flex justify-between py-1 text-[10px] text-slate-700">
                                        <span>Discount:</span>
                                        <span className="font-semibold text-orange-600">
                                            -৳{discount.toLocaleString()}
                                        </span>
                                    </div>
                                )}

                                {/* Grand Total */}
                                <div className="flex justify-between py-1.5 border-t-2 border-slate-900 text-[11px] font-bold">
                                    <span>GRAND TOTAL:</span>
                                    <span className="text-brand">৳{grandTotal.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        {purchase.notes && (
                            <div className="mt-4 pt-3 border-t border-slate-200">
                                <h3 className="text-[9px] font-bold text-slate-900 uppercase tracking-wide mb-1">
                                    Notes:
                                </h3>
                                <p className="text-[10px] text-slate-700 whitespace-pre-wrap">{purchase.notes}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PurchaseDetailsModal;
