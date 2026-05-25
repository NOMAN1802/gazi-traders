import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import {
    DocumentTextIcon,
    BookOpenIcon,
    MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetOrdersQuery, type Order } from '@/services/ordersApi';
import DateRangeSelector from '@/pages/reports/DateRangeSelector';

type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const CustomerLedgerListPage = () => {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<DateRangeType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');

    const { data, isLoading, isError, refetch } = useGetOrdersQuery({ limit: 10000 });

    const getDateRangeParams = useMemo(() => {
        if (dateRange === 'all') return null;

        const now = dayjs();
        let startDate: string;
        let endDate: string;

        if (dateRange === 'custom' && customStartDate && customEndDate) {
            startDate = dayjs(customStartDate).startOf('day').toISOString();
            endDate = dayjs(customEndDate).endOf('day').toISOString();
        } else {
            switch (dateRange) {
                case 'daily':
                    startDate = now.startOf('day').toISOString();
                    endDate = now.endOf('day').toISOString();
                    break;
                case 'weekly':
                    startDate = now.startOf('week').toISOString();
                    endDate = now.endOf('week').toISOString();
                    break;
                case 'monthly':
                    startDate = now.startOf('month').toISOString();
                    endDate = now.endOf('month').toISOString();
                    break;
                case 'yearly':
                    startDate = now.startOf('year').toISOString();
                    endDate = now.endOf('year').toISOString();
                    break;
                default:
                    startDate = now.startOf('day').toISOString();
                    endDate = now.endOf('day').toISOString();
            }
        }

        return { startDate, endDate };
    }, [dateRange, customStartDate, customEndDate]);

    const customers = useMemo(() => {
        const map = new Map<
            string,
            {
                name: string;
                phone?: string;
                email?: string;
                invoices: number;
                totalAmount: number;
                paidAmount: number;
                balance: number;
                firstOrder: string;
                lastOrder: string;
                orders: Order[];
            }
        >();

        if (data?.result && Array.isArray(data.result)) {
            data.result.forEach((order) => {
                const key = order.customer?.name ?? 'Walk-in Customer';
                const current = map.get(key);

                const orderPaid = order.status === 'completed'
                    ? order.totalAmount
                    : (order.paidAmount || 0);
                const orderTotal = order.totalAmount;
                const orderBalance = orderTotal - orderPaid;

                if (current) {
                    current.invoices += 1;
                    current.totalAmount += orderTotal;
                    current.paidAmount += orderPaid;
                    current.balance += orderBalance;
                    current.orders.push(order);
                    current.firstOrder = dayjs(order.createdAt).isBefore(dayjs(current.firstOrder))
                        ? order.createdAt : current.firstOrder;
                    current.lastOrder = dayjs(order.createdAt).isAfter(dayjs(current.lastOrder))
                        ? order.createdAt : current.lastOrder;
                } else {
                    map.set(key, {
                        name: key,
                        phone: order.customer?.phone,
                        email: order.customer?.email,
                        invoices: 1,
                        totalAmount: orderTotal,
                        paidAmount: orderPaid,
                        balance: orderBalance,
                        firstOrder: order.createdAt,
                        lastOrder: order.createdAt,
                        orders: [order],
                    });
                }
            });
        }

        return Array.from(map.values()).sort((a, b) =>
            dayjs(b.lastOrder).valueOf() - dayjs(a.lastOrder).valueOf()
        );
    }, [data]);

    const filteredCustomers = useMemo(() => {
        let filtered = customers;

        if (search.trim()) {
            const query = search.toLowerCase().trim();
            filtered = filtered.filter(c => {
                const name = c.name?.toLowerCase() || '';
                const phone = c.phone?.toLowerCase() || '';
                const email = c.email?.toLowerCase() || '';
                return name.includes(query) || phone.includes(query) || email.includes(query);
            });
        }

        if (getDateRangeParams) {
            const { startDate, endDate } = getDateRangeParams;
            const rangeStart = dayjs(startDate);
            const rangeEnd = dayjs(endDate);
            filtered = filtered.filter(c =>
                c.orders.some(order => {
                    const d = dayjs(order.createdAt);
                    return (d.isAfter(rangeStart) || d.isSame(rangeStart)) &&
                           (d.isBefore(rangeEnd) || d.isSame(rangeEnd));
                })
            );
        }

        return filtered;
    }, [customers, search, getDateRangeParams]);

    if (isLoading) return <Loader fullScreen message="Loading ledger..." />;
    if (isError) return <ErrorState description="Unable to load customer ledger" onRetry={refetch} />;

    return (
        <div className="space-y-8">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">CRM Layer</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Customer Ledger</h1>
                <p className="text-sm text-slate-500">Monitor customer balances, activity and credit behavior.</p>
            </div>

            {/* Search and Date Filter */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by name, phone, or email..."
                            className="w-full rounded-sm border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <DateRangeSelector
                        dateRange={dateRange}
                        customStartDate={customStartDate}
                        customEndDate={customEndDate}
                        onDateRangeChange={(range) => {
                            setDateRange(range);
                            setCustomStartDate('');
                            setCustomEndDate('');
                        }}
                        onCustomStartDateChange={setCustomStartDate}
                        onCustomEndDateChange={setCustomEndDate}
                        onApplyCustomRange={() => {
                            if (customStartDate && customEndDate) setDateRange('custom');
                        }}
                    />
                </div>
            </section>

            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-3 pr-4">S/N</th>
                                <th className="py-3 pr-4">Customer</th>
                                <th className="py-3 pr-4">Phone</th>
                                <th className="py-3 pr-4">Country</th>
                                <th className="py-3 pr-4">Balance</th>
                                <th className="py-3 pr-4">Total Invoice</th>
                                <th className="py-3 pr-4">Created On</th>
                                <th className="py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {filteredCustomers.map((customer, idx) => (
                                <tr key={customer.name} className="transition hover:bg-slate-50/70">
                                    <td className="py-4 pr-4 text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="py-4 pr-4">
                                        <p className="font-semibold text-slate-900">{customer.name}</p>
                                        <p className="text-xs text-slate-400">Priority</p>
                                    </td>
                                    <td className="py-4 pr-4">{customer.phone ?? '-'}</td>
                                    <td className="py-4 pr-4">Bangladesh</td>
                                    <td className="py-4 pr-4 font-semibold text-slate-900">
                                        ৳{Math.max(0, customer.balance).toLocaleString()}
                                    </td>
                                    <td className="py-4 pr-4">
                                        <p className="font-semibold text-slate-900">৳{customer.totalAmount.toLocaleString()}</p>
                                        <p className="text-xs text-slate-400">{customer.invoices} invoices</p>
                                    </td>
                                    <td className="py-4 pr-4">{dayjs(customer.firstOrder).format('DD MMM YYYY')}</td>
                                    <td className="py-4">
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/invoices?search=${encodeURIComponent(customer.name)}`)}
                                                className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                                            >
                                                <DocumentTextIcon className="h-3 w-3" />
                                                Invoice
                                            </button>
                                            <button
                                                onClick={() => navigate(`/customers/${encodeURIComponent(customer.name)}/ledger`)}
                                                className="inline-flex items-center gap-1 rounded-sm border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600 transition-all"
                                            >
                                                <BookOpenIcon className="h-3 w-3" />
                                                Ledger
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filteredCustomers.length === 0 && (
                        <div className="py-10 text-center text-sm text-slate-500">
                            {search || dateRange !== 'all'
                                ? 'No customers found matching your search criteria.'
                                : 'No customer data available.'}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
};

export default CustomerLedgerListPage;
