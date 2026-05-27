import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGetOrderByIdQuery } from '@/services/ordersApi';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { ChevronLeftIcon, PrinterIcon } from '@heroicons/react/24/outline';
import DepotInvoiceContent from '@/components/invoices/DepotInvoiceContent';

const PrintInvoicePage = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { data: order, isLoading, isError } = useGetOrderByIdQuery(id!);

    useEffect(() => {
        if (order) {
            setTimeout(() => window.print(), 500);
        }
    }, [order]);

    if (isLoading) return <Loader fullScreen message="Loading invoice..." />;
    if (isError || !order) return <ErrorState description="Invoice not found" />;

    return (
        <>
            {/* Screen-only controls */}
            <div className="print:hidden min-h-screen bg-slate-100 py-6 px-4">
                <div className="max-w-3xl mx-auto mb-4 flex items-center gap-3">
                    <button
                        onClick={() => navigate(-1)}
                        className="inline-flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                        Back
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-2 rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white shadow-md shadow-brand/30 transition-all hover:shadow-lg hover:shadow-brand/40"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Print
                    </button>
                </div>

                {/* Preview */}
                <div className="max-w-3xl mx-auto bg-white shadow-lg">
                    <DepotInvoiceContent order={order} />
                </div>
            </div>

            {/* Print-only content */}
            <div className="hidden print:block">
                <DepotInvoiceContent order={order} />
            </div>

            <style>{`
                @media print {
                    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; margin: 0; }
                    @page { size: A4; margin: 10mm; }
                }
            `}</style>
        </>
    );
};

export default PrintInvoicePage;
