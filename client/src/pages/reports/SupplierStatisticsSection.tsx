/* eslint-disable @typescript-eslint/no-unused-vars */
import { useMemo } from 'react';
import { useGetSuppliersQuery } from '@/services/suppliersApi';

interface SupplierStatisticsSectionProps {
    expenseData?: {
        expenses: Array<{
            _id: string;
            amount: number;
            category: string;
            supplier?: string | {
                _id: string;
                name: string;
            };
            date?: string;
            createdAt?: string;
        }>;
    };
    dateRange?: {
        startDate?: string;
        endDate?: string;
    } | undefined;
}

const SupplierStatisticsSection = ({
    expenseData,
    dateRange: _dateRange,
}: SupplierStatisticsSectionProps) => {
    const { data: suppliersData } = useGetSuppliersQuery({ limit: 100 });

    const suppliers = useMemo(() => suppliersData?.suppliers ?? [], [suppliersData]);

    // Calculate supplier-wise statistics
    const supplierStats = useMemo(() => {
        if (!expenseData?.expenses) return [];

        const purchaseExpenses = expenseData.expenses.filter(
            (exp) => exp.category === 'product_purchase'
        );

        const statsMap = new Map<
            string,
            {
                supplierId: string;
                supplierName: string;
                totalPurchases: number;
                purchaseCount: number;
                lastPurchaseDate?: string;
            }
        >();

        purchaseExpenses.forEach((expense) => {
            const supplierId =
                typeof expense.supplier === 'object'
                    ? expense.supplier?._id
                    : expense.supplier;

            if (!supplierId) return;

            const supplierName =
                typeof expense.supplier === 'object'
                    ? expense.supplier?.name
                    : suppliers.find((s) => s._id === supplierId)?.name || 'Unknown Supplier';

            const existing = statsMap.get(supplierId) || {
                supplierId,
                supplierName,
                totalPurchases: 0,
                purchaseCount: 0,
                lastPurchaseDate: undefined,
            };

            existing.totalPurchases += expense.amount || 0;
            existing.purchaseCount += 1;

            const expenseDate = expense.date || expense.createdAt;
            if (
                expenseDate &&
                (!existing.lastPurchaseDate || expenseDate > existing.lastPurchaseDate)
            ) {
                existing.lastPurchaseDate = expenseDate;
            }

            statsMap.set(supplierId, existing);
        });

        return Array.from(statsMap.values())
            .sort((a, b) => b.totalPurchases - a.totalPurchases)
            .slice(0, 10); // Top 10 suppliers
    }, [expenseData, suppliers]);

    const totalSupplierPurchases = useMemo(() => {
        return supplierStats.reduce((sum, stat) => sum + stat.totalPurchases, 0);
    }, [supplierStats]);

    const totalSupplierCount = supplierStats.length;
    const totalPurchaseCount = supplierStats.reduce((sum, stat) => sum + stat.purchaseCount, 0);

    const supplierCards = [
        {
            label: 'Total Suppliers',
            value: totalSupplierCount,
            delta: '+0.0%',
            color: 'blue' as const,
            icon: '🏢',
            subtitle: 'with purchases',
        },
        {
            label: 'Total Purchases',
            value: totalPurchaseCount,
            delta: '+0.0%',
            color: 'green' as const,
            icon: '📦',
            subtitle: 'transaction count',
        },
        {
            label: 'Total Purchase Value',
            value: `৳${totalSupplierPurchases.toLocaleString()}`,
            delta: '+0.0%',
            color: 'emerald' as const,
            icon: '💰',
            subtitle: 'all suppliers',
        },
        {
            label: 'Avg per Supplier',
            value:
                totalSupplierCount > 0
                    ? `৳${Math.round(totalSupplierPurchases / totalSupplierCount).toLocaleString()}`
                    : '৳0',
            delta: '+0.0%',
            color: 'purple' as const,
            icon: '📊',
            subtitle: 'average purchase',
        },
    ];

    return (
        <div className="space-y-8">
            {/* Supplier Summary Cards */}
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {supplierCards.map((card) => (
                    <div
                        key={card.label}
                        className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1"
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                                        {card.label}
                                    </p>
                                </div>
                                <p
                                    className={`text-2xl font-bold ${
                                        card.color === 'green'
                                            ? 'text-emerald-600'
                                            : card.color === 'emerald'
                                            ? 'text-emerald-600'
                                            : card.color === 'purple'
                                            ? 'text-purple-600'
                                            : 'text-blue-600'
                                    } group-hover:scale-105 transition-transform duration-300`}
                                >
                                    {card.value}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">
                                    {card.subtitle}
                                </p>
                            </div>
                            <div
                                className={`rounded-sm p-2 ${
                                    card.color === 'green'
                                        ? 'bg-emerald-100'
                                        : card.color === 'emerald'
                                        ? 'bg-emerald-100'
                                        : card.color === 'purple'
                                        ? 'bg-purple-100'
                                        : 'bg-blue-100'
                                } opacity-60 group-hover:opacity-100 transition-opacity duration-300`}
                            >
                                <div
                                    className={`h-2 w-2 rounded-sm ${
                                        card.color === 'green'
                                            ? 'bg-emerald-500'
                                            : card.color === 'emerald'
                                            ? 'bg-emerald-500'
                                            : card.color === 'purple'
                                            ? 'bg-purple-500'
                                            : 'bg-blue-500'
                                    }`}
                                ></div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center">
                            <span
                                className={`text-xs font-semibold ${
                                    card.delta.startsWith('+') ? 'text-emerald-600' : 'text-red-500'
                                }`}
                            >
                                {card.delta}
                            </span>
                            <span className="ml-1 text-xs text-slate-400">vs last month</span>
                        </div>
                        <div
                            className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${
                                card.color === 'green'
                                    ? 'bg-emerald-500'
                                    : card.color === 'emerald'
                                    ? 'bg-emerald-500'
                                    : card.color === 'purple'
                                    ? 'bg-purple-500'
                                    : 'bg-blue-500'
                            }`}
                        ></div>
                    </div>
                ))}
            </section>

            {/* Supplier Statistics Table */}
            <div className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <h3 className="text-lg font-semibold text-slate-900 mb-4">Supplier Statistics</h3>
                {supplierStats.length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-8">
                        No supplier purchase data available
                    </p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                            <thead className="text-xs uppercase text-slate-500 border-b border-slate-100">
                                <tr>
                                    <th className="py-3 text-left">S/N</th>
                                    <th className="py-3 text-left">Supplier</th>
                                    <th className="py-3 text-right">Total Purchases</th>
                                    <th className="py-3 text-right">Purchase Count</th>
                                    <th className="py-3 text-right">Avg Purchase</th>
                                    <th className="py-3 text-left">Last Purchase</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {supplierStats.map((stat, idx) => (
                                    <tr key={stat.supplierId} className="hover:bg-slate-50/50">
                                        <td className="py-3 text-slate-400 text-xs">{idx + 1}</td>
                                        <td className="py-3 font-medium text-slate-900">
                                            {stat.supplierName}
                                        </td>
                                        <td className="py-3 text-right font-semibold text-emerald-600">
                                            ৳{stat.totalPurchases.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right text-slate-600">
                                            {stat.purchaseCount}
                                        </td>
                                        <td className="py-3 text-right text-slate-600">
                                            ৳
                                            {stat.purchaseCount > 0
                                                ? Math.round(
                                                      stat.totalPurchases / stat.purchaseCount
                                                  ).toLocaleString()
                                                : '0'}
                                        </td>
                                        <td className="py-3 text-slate-500">
                                            {stat.lastPurchaseDate
                                                ? new Date(stat.lastPurchaseDate).toLocaleDateString(
                                                      'en-GB',
                                                      {
                                                          day: '2-digit',
                                                          month: 'short',
                                                          year: 'numeric',
                                                      }
                                                  )
                                                : 'N/A'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                            {supplierStats.length > 0 && (
                                <tfoot className="border-t-2 border-slate-200 bg-slate-50">
                                    <tr>
                                        <td className="py-3 font-semibold text-slate-900">Total</td>
                                        <td className="py-3 text-right font-bold text-emerald-600">
                                            ৳{totalSupplierPurchases.toLocaleString()}
                                        </td>
                                        <td className="py-3 text-right font-semibold text-slate-900">
                                            {totalPurchaseCount}
                                        </td>
                                        <td className="py-3 text-right font-semibold text-slate-900">
                                            ৳
                                            {totalPurchaseCount > 0
                                                ? Math.round(
                                                      totalSupplierPurchases / totalPurchaseCount
                                                  ).toLocaleString()
                                                : '0'}
                                        </td>
                                        <td></td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SupplierStatisticsSection;

