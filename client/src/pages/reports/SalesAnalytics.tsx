import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface SalesAnalyticsProps {
    monthlySalesData: Array<{
        month: string;
        received: number;
        pending: number;
    }>;
    salesSummary: {
        totalSales: number;
        receipts: number;
        expenses: number;
        earnings: number;
    };
}

const SalesAnalytics = ({ monthlySalesData, salesSummary }: SalesAnalyticsProps) => {
    return (
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Sales Analytics</h3>

            {/* Sales Summary Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                    <p className="text-xs text-slate-500 mb-1">Total Sales</p>
                    <p className="text-xl font-bold text-purple-600">৳{salesSummary.totalSales.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 mb-1">Receipts</p>
                    <p className="text-xl font-bold text-emerald-600">৳{salesSummary.receipts.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 mb-1">Expenses</p>
                    <p className="text-xl font-bold text-red-600">৳{salesSummary.expenses.toLocaleString()}</p>
                </div>
                <div>
                    <p className="text-xs text-slate-500 mb-1">Earnings</p>
                    <p className="text-xl font-bold text-slate-900">৳{salesSummary.earnings.toLocaleString()}</p>
                </div>
            </div>

            {/* Chart Legend */}
            <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-blue-500"></div>
                    <span className="text-xs text-slate-600">Received</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-sm bg-yellow-500"></div>
                    <span className="text-xs text-slate-600">Pending</span>
                </div>
            </div>

            {/* Monthly Sales Bar Chart */}
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlySalesData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                        <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="#94A3B8" />
                        <YAxis
                            tick={{ fontSize: 11 }}
                            stroke="#94A3B8"
                            tickFormatter={(value) => `৳${value.toLocaleString()}`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                        />
                        <Legend />
                        <Bar dataKey="received" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pending" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default SalesAnalytics;

