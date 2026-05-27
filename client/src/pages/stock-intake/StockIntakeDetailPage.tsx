import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useGetStockIntakeByIdQuery } from '@/services/stockIntakesApi';

export default function StockIntakeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: intake, isLoading, isError } = useGetStockIntakeByIdQuery(id!);

    if (isLoading) return (
        <div className="flex items-center justify-center py-24 text-slate-500 text-sm">Loading...</div>
    );
    if (isError || !intake) return (
        <div className="flex items-center justify-center py-24 text-red-500 text-sm">Record not found.</div>
    );

    const orderedPcs = intake.items.reduce((s, i) => s + i.orderedPieces, 0);
    const receivedPcs = intake.items.reduce((s, i) => s + i.receivedPieces, 0);
    const pendingPcs = intake.items.reduce((s, i) => s + i.pendingPieces, 0);
    const isPartial = intake.status === 'partial';

    return (
        <div className="space-y-6 max-w-4xl">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link
                    to="/stock-intake"
                    className="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeftIcon className="h-4 w-4" />
                    Back
                </Link>
                <div className="flex-1">
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl font-bold text-slate-900">{intake.intakeNumber}</h1>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            isPartial ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                            {isPartial ? 'Partial' : 'Complete'}
                        </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-0.5">
                        {new Date(intake.createdAt).toLocaleDateString('en-GB', {
                            day: '2-digit', month: 'long', year: 'numeric'
                        })}
                    </p>
                </div>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Ordered Pieces', value: orderedPcs, color: 'text-slate-700' },
                    { label: 'Received Pieces', value: receivedPcs, color: 'text-emerald-700' },
                    { label: 'Pending Pieces', value: pendingPcs, color: pendingPcs > 0 ? 'text-red-600' : 'text-slate-400' },
                ].map(card => (
                    <div key={card.label} className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
                        <p className="text-xs font-medium text-slate-500">{card.label}</p>
                        <p className={`mt-1 text-2xl font-bold ${card.color}`}>{card.value.toLocaleString()}</p>
                    </div>
                ))}
            </div>

            {/* Items table */}
            <div className="overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm">
                <table className="min-w-full divide-y divide-slate-100">
                    <thead className="bg-slate-50">
                        <tr>
                            {['#', 'Product', 'Category', 'Unit', 'Ctn Size', 'Ordered', 'Received', 'Pending', 'Rcv Pcs'].map(h => (
                                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {intake.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                                <td className="px-4 py-3 text-sm text-slate-500">{idx + 1}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-slate-900">{item.productName}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{item.categoryName ?? '—'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{item.unit ?? '—'}</td>
                                <td className="px-4 py-3 text-sm text-slate-600">{item.cartoonSize ?? '—'}</td>
                                <td className="px-4 py-3 text-sm text-slate-700 font-medium">{item.orderedQty}</td>
                                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{item.receivedQty}</td>
                                <td className="px-4 py-3 text-sm font-semibold">
                                    {item.pendingQty > 0
                                        ? <span className="text-red-600">{item.pendingQty}</span>
                                        : <span className="text-slate-400">—</span>
                                    }
                                </td>
                                <td className="px-4 py-3 text-sm font-semibold text-emerald-700">{item.receivedPieces.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Notes */}
            {intake.notes && (
                <div className="rounded-sm border border-slate-200 bg-white p-4 shadow-sm">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">{intake.notes}</p>
                </div>
            )}
        </div>
    );
}
