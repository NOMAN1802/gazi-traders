import { useEffect, useRef } from 'react';
import { useGetOrderByIdQuery } from '@/services/ordersApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import { useReactToPrint } from 'react-to-print';
import DepotInvoiceContent from './DepotInvoiceContent';

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
        pageStyle: `
            @page { size: A4; margin: 10mm; }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                table { page-break-inside: auto; }
                tr { page-break-inside: avoid; page-break-after: auto; }
            }
        `,
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
                    <button onClick={onClose} className="mt-4 w-full rounded-sm bg-brand px-4 py-3 text-sm font-semibold text-white">
                        Close
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-4xl rounded-sm bg-white shadow-2xl overflow-hidden flex flex-col h-[95vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50 shrink-0">
                    <h3 className="text-base font-bold text-slate-900">
                        Invoice
                        <span className="ml-3 text-sm font-normal text-slate-500">#{order.orderNumber}</span>
                    </h3>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => handlePrint()}
                            className="inline-flex items-center gap-2 rounded-sm bg-brand/10 px-4 py-2 text-sm font-semibold text-brand hover:bg-brand/20 transition-colors"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            Print Invoice
                        </button>
                        <button onClick={onClose} className="rounded-sm p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-600 transition-colors">
                            <XMarkIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto bg-slate-100 p-6">
                    <div
                        ref={printRef}
                        className="mx-auto bg-white shadow-sm"
                        style={{ width: '100%', maxWidth: '760px' }}
                    >
                        <DepotInvoiceContent order={order} />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InvoiceModal;
