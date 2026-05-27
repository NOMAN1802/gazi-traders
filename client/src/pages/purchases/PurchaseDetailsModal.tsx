import { useRef, useEffect } from 'react';
import { XMarkIcon, PrinterIcon } from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetPurchaseByIdQuery } from '@/services/purchasesApi';

interface PurchaseDetailsModalProps {
    purchaseId: string | null;
    onClose: () => void;
}

const SHOP_NAME = 'M/S.Gazi Traders';
const SHOP_SUBTITLE = 'Depot Invoice';
const SHOP_MOBILE = '01716781486';

const PurchaseDetailsModal = ({ purchaseId, onClose }: PurchaseDetailsModalProps) => {
    const { data: purchase, isLoading, isError } = useGetPurchaseByIdQuery(purchaseId || '', { skip: !purchaseId });
    const printRef = useRef<HTMLDivElement>(null);

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Invoice-${purchase?.purchaseNumber || purchaseId}`,
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
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    if (!purchaseId) return null;

    if (isLoading) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-4xl rounded-sm bg-white p-8 shadow-2xl h-[90vh] flex items-center justify-center">
                    <Loader message="Loading invoice..." />
                </div>
            </div>
        );
    }

    if (isError || !purchase) {
        return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-2xl">
                    <ErrorState description="Purchase not found" />
                    <button onClick={onClose} className="mt-4 w-full rounded-sm bg-brand px-4 py-3 text-sm font-semibold text-white">Close</button>
                </div>
            </div>
        );
    }

    const totalAmount = purchase.totalAmount;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-5xl rounded-sm bg-white shadow-2xl overflow-hidden flex flex-col h-[95vh]">
                {/* Modal Header */}
                <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50 shrink-0">
                    <h3 className="text-base font-bold text-slate-900">
                        Purchase Invoice
                        <span className="ml-3 text-sm font-normal text-slate-500">#{purchase.purchaseNumber}</span>
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
                    {/* Invoice Container */}
                    <div
                        ref={printRef}
                        className="mx-auto bg-white shadow-sm"
                        style={{ width: '100%', maxWidth: '780px', fontFamily: 'Arial, sans-serif', fontSize: '11px', padding: '12px 14px' }}
                    >
                        {/* ── Invoice Header ── */}
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '6px', marginBottom: '6px' }}>
                            <div style={{ fontSize: '18px', fontWeight: 'bold' }}>{SHOP_NAME}</div>
                            <div style={{ fontSize: '13px', fontWeight: '600' }}>{SHOP_SUBTITLE}</div>
                            <div style={{ fontSize: '11px' }}>Mobile:{SHOP_MOBILE}</div>
                        </div>

                        {/* ── Supplier + Date ── */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '6px' }}>
                            <tbody>
                                <tr>
                                    <td style={{ verticalAlign: 'top', width: '45%' }}>
                                        <div><strong>Distributer:</strong> {purchase.supplier.name}</div>
                                        {purchase.supplier.address && (
                                            <div><strong>Address:</strong> {purchase.supplier.address}</div>
                                        )}
                                        {purchase.supplier.phone && (
                                            <div><strong>Mobile:</strong> {purchase.supplier.phone}</div>
                                        )}
                                    </td>
                                    <td style={{ verticalAlign: 'top', textAlign: 'center', width: '30%' }}>
                                        {purchase.supplier.contactPerson && (
                                            <div style={{ fontWeight: '600', fontSize: '12px' }}>{purchase.supplier.contactPerson}</div>
                                        )}
                                    </td>
                                    <td style={{ verticalAlign: 'top', textAlign: 'right', width: '25%' }}>
                                        <div style={{ fontWeight: '600' }}>DATE {dayjs(purchase.createdAt).format('DD.MM.YY')}</div>
                                        <div style={{ color: '#555', fontSize: '10px' }}>#{purchase.purchaseNumber}</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        {/* ── Items Table ── */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000' }}>
                            <thead>
                                <tr style={{ backgroundColor: '#f0f0f0' }}>
                                    <th style={th}>SL NO</th>
                                    <th style={{ ...th, textAlign: 'left', minWidth: '130px' }}>Product Name</th>
                                    <th style={th}>Category</th>
                                    <th style={th}>Rate</th>
                                    <th style={th}>Dozen</th>
                                    <th style={th}>Cartoon</th>
                                    <th style={th}>Quantity</th>
                                    <th style={th}>Amount</th>
                                    <th style={th}>Free</th>
                                </tr>
                            </thead>
                            <tbody>
                                {purchase.items.map((item, idx) => {
                                    const isDozen = item.unit === 'Dozen';
                                    const isCartoon = item.unit === 'Cartoon';
                                    const dozenVal = isDozen && item.inputQty ? item.inputQty : '';
                                    const cartoonVal = isCartoon && item.inputQty ? item.inputQty : '';
                                    const amount = item.totalPrice;
                                    const freeVal = item.free && item.free > 0 ? item.free : '';

                                    return (
                                        <tr key={idx} style={{ borderBottom: '1px solid #ccc' }}>
                                            <td style={td}>{idx + 1}</td>
                                            <td style={{ ...td, textAlign: 'left' }}>{item.productName}</td>
                                            <td style={td}>{item.categoryName || '—'}</td>
                                            <td style={td}>{item.unitPrice.toFixed(2)}</td>
                                            <td style={td}>{dozenVal !== '' ? dozenVal : ''}</td>
                                            <td style={td}>{cartoonVal !== '' ? cartoonVal : ''}</td>
                                            <td style={td}>{item.quantity.toLocaleString()}</td>
                                            <td style={{ ...td, textAlign: 'right' }}>{amount > 0 ? amount.toFixed(2) : ''}</td>
                                            <td style={td}>{freeVal}</td>
                                        </tr>
                                    );
                                })}
                                {/* Empty rows for visual padding if few items */}
                                {purchase.items.length < 5 && Array.from({ length: 5 - purchase.items.length }).map((_, i) => (
                                    <tr key={`empty-${i}`} style={{ borderBottom: '1px solid #eee' }}>
                                        {Array.from({ length: 9 }).map((__, j) => (
                                            <td key={j} style={{ ...td, height: '18px' }}></td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* ── Totals ── */}
                        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0', border: '1px solid #000', borderTop: 'none' }}>
                            <tbody>
                                <tr>
                                    <td style={{ width: '60%', border: '1px solid #000', padding: '3px 5px' }}></td>
                                    <td style={{ textAlign: 'right', fontWeight: '700', border: '1px solid #000', padding: '3px 5px', whiteSpace: 'nowrap' }}>Total Taka</td>
                                    <td style={{ textAlign: 'right', fontWeight: '700', border: '1px solid #000', padding: '3px 8px', minWidth: '80px' }}>{totalAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '3px 5px' }}></td>
                                    <td style={{ textAlign: 'right', border: '1px solid #000', padding: '3px 5px', whiteSpace: 'nowrap' }}>Depo Due</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 8px' }}></td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '3px 5px' }}></td>
                                    <td style={{ textAlign: 'right', fontWeight: '600', border: '1px solid #000', padding: '3px 5px', whiteSpace: 'nowrap' }}>Sub Total</td>
                                    <td style={{ textAlign: 'right', fontWeight: '600', border: '1px solid #000', padding: '3px 8px' }}>{totalAmount.toFixed(2)}</td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '3px 5px' }}></td>
                                    <td style={{ textAlign: 'right', border: '1px solid #000', padding: '3px 5px', whiteSpace: 'nowrap' }}>Adjust</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 8px' }}></td>
                                </tr>
                                <tr>
                                    <td style={{ border: '1px solid #000', padding: '3px 5px' }}></td>
                                    <td style={{ textAlign: 'right', border: '1px solid #000', padding: '3px 5px', whiteSpace: 'nowrap' }}>Others</td>
                                    <td style={{ border: '1px solid #000', padding: '3px 8px' }}></td>
                                </tr>
                            </tbody>
                        </table>

                        {/* ── Notes ── */}
                        {purchase.notes && (
                            <div style={{ marginTop: '8px', fontSize: '10px', color: '#555' }}>
                                <strong>Notes:</strong> {purchase.notes}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const th: React.CSSProperties = {
    border: '1px solid #000',
    padding: '3px 4px',
    textAlign: 'center',
    fontWeight: '700',
    fontSize: '10px',
    whiteSpace: 'nowrap',
};

const td: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '2px 4px',
    textAlign: 'center',
    fontSize: '10px',
    whiteSpace: 'nowrap',
};

export default PurchaseDetailsModal;
