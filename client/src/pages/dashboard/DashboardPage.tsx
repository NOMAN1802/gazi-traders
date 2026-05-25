import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Link } from 'react-router-dom';
import {
    Cell,
    Line,
    LineChart,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
} from 'recharts';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import StatusBadge from '@/components/common/StatusBadge';
import TrendPill from '@/components/common/TrendPill';
import StockAlert from '@/components/common/StockAlert';
// import InventoryStats from '@/components/common/InventoryStats';
import { useGetDashboardQuery } from '@/services/dashboardApi';

dayjs.extend(relativeTime);

const DashboardPage = () => {
    const { data, isLoading, isError, refetch } = useGetDashboardQuery();

    if (isLoading) {
        return <Loader fullScreen message="Loading analytics..." />;
    }

    if (isError || !data) {
        return (
            <ErrorState
                title="Unable to load dashboard"
                description="Check your network or try refreshing the page."
                onRetry={refetch}
            />
        );
    }

    const paymentBreakdown = [
        { name: 'Paid', value: data.orders?.completed ?? 0, color: '#3B82F6' },
        { name: 'Pending', value: data.orders?.pending ?? 0, color: '#EF4444' },
        { name: 'Partial', value: data.orders?.partial ?? 0, color: '#F97316' },
    ];

    const revenueSeries = (data.recentOrders || [])
        .slice(0, 7)
        .map((order) => ({
            label: dayjs(order.createdAt).format('MMM D'),
            total: order.totalAmount ?? 0,
        }))
        .reverse();

    const topSellingProducts = data.topProducts || [];

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Overview</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Enterprise Dashboard</h1>
                <p className="text-sm text-slate-500">Keep track of invoices, expenses, inventory & customer health in one glance.</p>
            </div>

            {/* Stock Alert */}
            <StockAlert />

            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[
                    {
                        label: 'Total Stock Value',
                        value: `৳${(data.inventory?.totalStockValue ?? 0).toLocaleString()}`,
                        delta: '+2.56%',
                        color: 'blue',
                        icon: '📊',
                        subtitle: 'Stock value',
                        link: '/products',
                    },
                    {
                        label: 'Pending Payment',
                        value: `৳${(data.financial?.outstanding ?? 0).toLocaleString()}`,
                        delta: '+1.14%',
                        color: 'amber',
                        icon: '💰',
                        subtitle: 'Outstanding',
                        link: '/invoices',
                    },
                    {
                        label: 'Active Products',
                        value: data.inventory?.totalProducts ?? 0,
                        delta: '-0.82%',
                        color: 'red',
                        icon: '📦',
                        subtitle: 'Total products',
                        link: '/products',
                    },
                    {
                        label: 'Customers',
                        value: data.users?.total ?? 0,
                        delta: '+3.45%',
                        color: 'emerald',
                        icon: '👥',
                        subtitle: 'Active customers',
                        link: '/customers/ledger',
                    }
                ].map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${card.color === 'emerald' ? 'text-emerald-600' :
                                    card.color === 'amber' ? 'text-amber-600' :
                                        card.color === 'red' ? 'text-red-600' :
                                            'text-blue-600'
                                    } group-hover:scale-105 transition-transform duration-300`}>
                                    {card.value}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{card.subtitle}</p>
                            </div>
                            <div className={`rounded-sm p-2 ${card.color === 'emerald' ? 'bg-emerald-100' :
                                card.color === 'amber' ? 'bg-amber-100' :
                                    card.color === 'red' ? 'bg-red-100' :
                                        'bg-blue-100'
                                } opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
                                <div className={`h-2 w-2 rounded-sm ${card.color === 'emerald' ? 'bg-emerald-500' :
                                    card.color === 'amber' ? 'bg-amber-500' :
                                        card.color === 'red' ? 'bg-red-500' :
                                            'bg-blue-500'
                                    }`}></div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                            <div className="flex items-center">
                                <span className={`text-xs font-semibold ${card.delta.startsWith('+') ? 'text-emerald-600' : 'text-red-500'
                                    }`}>
                                    {card.delta}
                                </span>
                                <span className="ml-1 text-xs text-slate-400">vs last month</span>
                            </div>
                            <Link
                                to={card.link}
                                className={`text-xs font-semibold ${card.color === 'emerald' ? 'text-emerald-600 hover:text-emerald-800' :
                                    card.color === 'amber' ? 'text-amber-600 hover:text-amber-800' :
                                        card.color === 'red' ? 'text-red-600 hover:text-red-800' :
                                            'text-blue-600 hover:text-blue-800'
                                    } underline underline-offset-2 transition-colors`}
                            >
                                View Details
                            </Link>
                        </div>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 pointer-events-none ${card.color === 'emerald' ? 'bg-emerald-500' :
                            card.color === 'amber' ? 'bg-amber-500' :
                                card.color === 'red' ? 'bg-red-500' :
                                    'bg-blue-500'
                            }`}></div>
                    </div>
                ))}
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.15fr_.85fr]">
                <div className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Top Selling Products</p>
                            <p className="text-xs text-slate-400 mt-1">Top 6 products by highest revenue</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {topSellingProducts.length === 0 ? (
                            <p className="text-sm text-slate-500 text-center py-8">No products found</p>
                        ) : (
                            topSellingProducts.map((product, index) => (
                                <div key={product._id} className="flex items-center justify-between rounded-sm bg-slate-50/60 p-4 hover:bg-slate-50 transition-colors">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-brand/10 text-brand font-bold text-sm">
                                            {index + 1}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm font-semibold text-slate-900">{product.productName}</p>
                                            <p className="text-xs text-slate-500">Quantity: {product.totalQuantity}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-bold text-slate-900">৳{(product.totalRevenue ?? 0).toLocaleString()}</p>
                                        {/* <p className="text-xs text-slate-500">Revenue</p> */}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                    <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Recent Activities</p>
                        <button className="text-xs font-semibold text-brand">View all</button>
                    </div>
                    <div className="mt-4 space-y-4">
                        {(data.activities || []).slice(0, 5).map((activity) => (
                            <div key={activity.timestamp} className="flex items-start gap-3 rounded-sm bg-slate-50/60 p-3">
                                <span className="mt-1 h-2 w-2 rounded-sm bg-brand" />
                                <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                        {activity.user} <span className="text-slate-500"> {activity.action} </span> {activity.type}
                                    </p>
                                    <p className="text-xs text-slate-400">{dayjs(activity.timestamp).fromNow()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            <section className="grid gap-6 xl:grid-cols-[1.1fr_.9fr]">
                <div className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Selling Trend</p>
                            <p className="text-xs text-slate-400">Last 7 invoices</p>
                        </div>
                    </div>
                    <div className="mt-6 h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={revenueSeries}>
                                <Tooltip cursor={false} contentStyle={{ borderRadius: 16 }} />
                                <Line type="monotone" dataKey="total" stroke="#5C6CFF" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Payment Statistics</p>
                            <p className="text-xs text-slate-400">Updated {dayjs().format('DD MMM YYYY')}</p>
                        </div>
                        <TrendPill value={3.2} isPositive label="vs last txn" />
                    </div>
                    <div className="mt-6 grid gap-6">
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Tooltip contentStyle={{ borderRadius: 12 }} />
                                    <Pie
                                        data={paymentBreakdown}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={90}
                                        paddingAngle={4}
                                    >
                                        {paymentBreakdown.map((entry) => (
                                            <Cell key={entry.name} fill={entry.color} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <ul className="space-y-3 text-sm text-slate-600">
                            {paymentBreakdown.map((item) => (
                                <li key={item.name} className="flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.color }} />
                                        {item.name}
                                    </span>
                                    <span className="font-semibold">{item.value}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </section>

            {/* Inventory Analytics */}
            {/* <InventoryStats /> */}

            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">Recent Invoices</p>
                        <p className="text-xs text-slate-400">Track payment modes and statuses at a glance</p>
                    </div>
                    <button className="rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600">
                        View all invoices
                    </button>
                </div>
                <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-3 pr-4">S/N</th>
                                <th className="py-3 pr-4">ID</th>
                                <th className="py-3 pr-4">Customer</th>
                                <th className="py-3 pr-4">Amount</th>
                                <th className="py-3 pr-4">Status</th>
                                <th className="py-3 pr-4">Payment Mode</th>
                                <th className="py-3">Due</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {(data.recentOrders || []).slice(0, 8).map((order, idx) => (
                                <tr key={order._id} className="transition hover:bg-slate-50/80">
                                    <td className="py-4 pr-4 text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="py-4 pr-4 font-semibold text-slate-900">{order.orderNumber}</td>
                                    <td className="py-4 pr-4">{order.customer?.name ?? 'Walk-in Customer'}</td>
                                    <td className="py-4 pr-4 font-semibold text-slate-900">৳{(order.totalAmount ?? 0).toLocaleString()}</td>
                                    <td className="py-4 pr-4">
                                        <StatusBadge status={order.status} />
                                    </td>
                                    <td className="py-4 pr-4 capitalize">{order.paymentMethod ?? 'Cash'}</td>
                                    <td className="py-4">{dayjs(order.createdAt).add(8, 'day').format('DD MMM')}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default DashboardPage;

