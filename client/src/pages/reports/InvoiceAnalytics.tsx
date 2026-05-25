import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

interface InvoiceAnalyticsProps {
    invoiceChartData: Array<{
        name: string;
        value: number;
        color: string;
    }>;
    invoiceAnalyticsData: {
        invoiced: number;
        received: number;
        pending: number;
    };
}

const InvoiceAnalytics = ({ invoiceChartData, invoiceAnalyticsData }: InvoiceAnalyticsProps) => {
    return (
        <div className="rounded-sm border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-6">Invoice Analytics</h3>

            {/* Donut Chart */}
            <div className="h-64 flex items-center justify-center mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Tooltip
                            contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="square"
                        />
                        <Pie
                            data={invoiceChartData}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={100}
                            paddingAngle={4}
                        >
                            {invoiceChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Pie>
                    </PieChart>
                </ResponsiveContainer>
            </div>

            {/* Invoice Summary Values */}
            <div className="space-y-3 border-t border-slate-100 pt-4">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-blue-500"></div>
                        <span className="text-sm text-slate-600">Invoiced:</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">৳{invoiceAnalyticsData.invoiced.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-emerald-500"></div>
                        <span className="text-sm text-slate-600">Received:</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">৳{invoiceAnalyticsData.received.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded bg-yellow-500"></div>
                        <span className="text-sm text-slate-600">Pending:</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">৳{invoiceAnalyticsData.pending.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

export default InvoiceAnalytics;

