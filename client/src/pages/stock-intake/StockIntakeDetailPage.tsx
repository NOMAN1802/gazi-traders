import { useParams, Link } from 'react-router-dom';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useGetStockIntakeByIdQuery } from '@/services/stockIntakesApi';

export default function StockIntakeDetailPage() {
    const { id } = useParams<{ id: string }>();
    const { data: intake, isLoading, isError } = useGetStockIntakeByIdQuery(id!);

    if (isLoading) return (
        <div className="flex items-center justify-center py-24 text-slate-400 text-xs">Loading...</div>
    );
    if (isError || !intake) return (
        <div className="flex items-center justify-center py-24 text-red-500 text-xs">Record not found.</div>
    );

    const isPartial = intake.status === 'partial';

    // Detect factory from item units
    const hasCartoon = intake.items.some(i => i.unit === 'Cartoon');
    const qtyLabel   = hasCartoon ? 'Ctr (Qty)' : 'Dozen (Qty)';
    const targetUnit = hasCartoon ? 'Cartoon' : 'Dozen';

    const totalQty = intake.items
        .filter(i => i.unit === targetUnit)
        .reduce((s, i) => s + i.receivedQty, 0);
    const totalPcs = intake.items.reduce((s, i) => s + i.receivedPieces, 0);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Link
                    to="/stock-intake"
                    className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ArrowLeftIcon className="h-3.5 w-3.5" />
                    Back
                </Link>
                <div className="flex items-center gap-2 flex-1">
                    <h1 className="text-lg font-bold text-slate-900">{intake.intakeNumber}</h1>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-semibold ${
                        isPartial ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                        {isPartial ? 'Partial' : 'Complete'}
                    </span>
                </div>
                <p className="text-[10px] text-slate-400">
                    {new Date(intake.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit', month: 'long', year: 'numeric'
                    })}
                </p>
            </div>

            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Items</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{intake.items.length}</p>
                </div>
                <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">{qtyLabel}</p>
                    <p className="mt-1 text-xl font-bold text-slate-800">{totalQty.toLocaleString()}</p>
                </div>
                <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Quantity (Pcs)</p>
                    <p className="mt-1 text-xl font-bold text-emerald-700">{totalPcs.toLocaleString()}</p>
                </div>
                <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">Pending Pcs</p>
                    <p className={`mt-1 text-xl font-bold ${intake.items.reduce((s, i) => s + i.pendingPieces, 0) > 0 ? 'text-red-600' : 'text-slate-300'}`}>
                        {intake.items.reduce((s, i) => s + i.pendingPieces, 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Items table — full width, responsive */}
            <div className="w-full overflow-x-auto rounded-sm border border-slate-200 bg-white shadow-sm">
                <table className="w-full divide-y divide-slate-100 text-[10px]">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500 w-8">#</th>
                            <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Product</th>
                            <th className="px-3 py-2 text-left text-[9px] font-semibold uppercase tracking-wider text-slate-500">Category</th>
                            <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-slate-500">{qtyLabel}</th>
                            <th className="px-3 py-2 text-center text-[9px] font-semibold uppercase tracking-wider text-emerald-600">Quantity (Pcs)</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {intake.items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                                <td className="px-3 py-2 font-medium text-slate-900">{item.productName}</td>
                                <td className="px-3 py-2 text-slate-500">{item.categoryName ?? '—'}</td>
                                <td className="px-3 py-2 text-center font-semibold text-slate-700">{item.receivedQty}</td>
                                <td className="px-3 py-2 text-center font-semibold text-emerald-700">{item.receivedPieces.toLocaleString()}</td>
                            </tr>
                        ))}
                        {/* Totals row */}
                        <tr className="bg-slate-50 border-t-2 border-slate-200">
                            <td colSpan={3} className="px-3 py-2 text-[9px] font-semibold uppercase tracking-wider text-slate-500">
                                Total ({intake.items.length} products)
                            </td>
                            <td className="px-3 py-2 text-center font-bold text-slate-800">{totalQty.toLocaleString()}</td>
                            <td className="px-3 py-2 text-center font-bold text-emerald-700">{totalPcs.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* Notes */}
            {intake.notes && (
                <div className="rounded-sm border border-slate-200 bg-white px-4 py-3 shadow-sm">
                    <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 mb-1">Notes</p>
                    <p className="text-xs text-slate-700">{intake.notes}</p>
                </div>
            )}
        </div>
    );
}
