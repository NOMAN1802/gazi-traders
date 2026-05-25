import { useMemo, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import {
    ArrowLeftIcon,
    MagnifyingGlassIcon,
    PrinterIcon,
    EyeIcon,
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import StatusBadge from '@/components/common/StatusBadge';
import { useGetOrdersQuery, useUpdateOrderMutation, type Order } from '@/services/ordersApi';
import DateRangeSelector from '@/pages/reports/DateRangeSelector';
import InvoiceModal from '@/components/invoices/InvoiceModal';

type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const CustomerLedgerPage = () => {
    const navigate = useNavigate();
    const { customerName } = useParams<{ customerName: string }>();
    const decodedCustomerName = customerName ? decodeURIComponent(customerName) : '';

    const [search, setSearch] = useState('');
    const [dateRange, setDateRange] = useState<DateRangeType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState<Order | null>(null);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
    const printRef = useRef<HTMLDivElement>(null);
    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `${decodedCustomerName} Ledger Report - ${dayjs().format('DD MMMM YYYY')}`,
        pageStyle: `
            @page {
                size: A4;
                margin: 20mm;
            }
            body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
                font-family: 'Inter', sans-serif;
                font-size: 10px;
                line-height: 1.5;
                color: #334155;
            }
            .print-header {
                text-align: center;
                margin-bottom: 20px;
            }
            .print-title {
                font-size: 20px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 5px;
            }
            .print-subtitle {
                font-size: 12px;
                color: #475569;
                margin-bottom: 15px;
            }
            .print-info-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                gap: 10px;
                margin-bottom: 20px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                padding: 10px;
                background-color: #f8fafc;
            }
            .print-info-item {
                display: flex;
                flex-direction: column;
                padding: 5px;
            }
            .print-info-label {
                font-size: 9px;
                font-weight: 600;
                color: #64748b;
                text-transform: uppercase;
            }
            .print-info-value {
                font-size: 11px;
                font-weight: 700;
                color: #1e293b;
                margin-top: 2px;
            }
            .print-section-title {
                font-size: 14px;
                font-weight: bold;
                color: #1e293b;
                margin-bottom: 10px;
                border-bottom: 1px solid #e2e8f0;
                padding-bottom: 5px;
            }
            .print-table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            .print-table th, .print-table td {
                border: 1px solid #e2e8f0;
                padding: 8px;
                text-align: left;
            }
            .print-table-th {
                background-color: #f1f5f9;
                font-weight: 600;
                color: #334155;
                text-transform: uppercase;
                font-size: 9px;
            }
            .print-table-td {
                background-color: #ffffff;
                color: #475569;
                font-size: 10px;
            }
            .text-right {
                text-align: right;
            }
            .text-center {
                text-align: center;
            }
            .font-semibold {
                font-weight: 600;
            }
            .text-red-600 {
                color: #dc2626;
            }
            .text-orange-600 {
                color: #ea580c;
            }
            .text-emerald-600 {
                color: #059669;
            }
            .print-table-footer-row-green td {
                background-color: #dcfce7;
                font-weight: bold;
                color: #16a34a;
            }
            .print-table-footer-row-red td {
                background-color: #fee2e2;
                font-weight: bold;
                color: #dc2626;
            }
            .print-table-footer-cell {
                padding: 8px;
                border: 1px solid #e2e8f0;
            }
            .no-print {
                display: none !important;
            }
            .page-break {
                page-break-before: always;
            }
        `,
    });

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

    const customer = useMemo(() => {
        if (!data?.result || !decodedCustomerName) return null;

        const customerOrders = data.result.filter(
            (order: Order) => (order.customer?.name ?? 'Walk-in Customer') === decodedCustomerName
        );

        if (customerOrders.length === 0) return null;

        let invoices = 0;
        let totalAmount = 0;
        let paidAmount = 0;
        let firstOrder = customerOrders[0].createdAt;
        let lastOrder = customerOrders[0].createdAt;

        customerOrders.forEach((order: Order) => {
            invoices += 1;
            totalAmount += order.totalAmount;
            const orderPaid = order.status === 'completed'
                ? order.totalAmount
                : (order.paidAmount || 0);
            paidAmount += orderPaid;

            if (dayjs(order.createdAt).isBefore(dayjs(firstOrder))) firstOrder = order.createdAt;
            if (dayjs(order.createdAt).isAfter(dayjs(lastOrder))) lastOrder = order.createdAt;
        });

        return {
            name: decodedCustomerName,
            phone: customerOrders[0].customer?.phone,
            email: customerOrders[0].customer?.email,
            invoices,
            totalAmount,
            paidAmount,
            balance: totalAmount - paidAmount,
            firstOrder,
            lastOrder,
            orders: customerOrders,
        };
    }, [data, decodedCustomerName]);

    const stats = useMemo(() => {
        if (!customer) return null;
        return {
            totalSales: customer.totalAmount,
            totalPaid: customer.paidAmount,
            totalDue: customer.balance,
        };
    }, [customer]);

    const filteredOrders = useMemo(() => {
        if (!customer) return [];

        let filtered = customer.orders;

        if (search.trim()) {
            const query = search.toLowerCase().trim();
            filtered = filtered.filter(order =>
                (order.orderNumber?.toLowerCase() || '').includes(query)
            );
        }

        if (getDateRangeParams) {
            const { startDate, endDate } = getDateRangeParams;
            const rangeStart = dayjs(startDate);
            const rangeEnd = dayjs(endDate);
            filtered = filtered.filter(order => {
                const orderDate = dayjs(order.createdAt);
                return (orderDate.isAfter(rangeStart) || orderDate.isSame(rangeStart)) &&
                       (orderDate.isBefore(rangeEnd) || orderDate.isSame(rangeEnd));
            });
        }

        return filtered;
    }, [customer, search, getDateRangeParams]);

    const filteredStats = useMemo(() => {
        if (!customer) return null;

        const totalSales = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
        const totalPaid = filteredOrders.reduce((sum, order) => {
            const paid = order.status === 'completed' ? order.totalAmount : (order.paidAmount || 0);
            return sum + paid;
        }, 0);

        return {
            totalSales,
            totalPaid,
            totalDue: totalSales - totalPaid,
        };
    }, [customer, filteredOrders]);

    const [updateOrder, { isLoading: isUpdatingOrder }] = useUpdateOrderMutation();

    if (isLoading) return <Loader fullScreen message="Loading customer ledger..." />;
    if (isError) return <ErrorState description="Unable to load customer ledger" onRetry={refetch} />;
    if (!customer) return <ErrorState description="Customer not found" onRetry={() => navigate('/customers')} />;

    const displayStats = filteredStats || stats;

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/customers')}
                        className="rounded-sm p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                    >
                        <ArrowLeftIcon className="h-6 w-6" />
                    </button>
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Customer Ledger</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">{customer.name}</h1>
                        <p className="text-sm text-slate-500">
                            {customer.phone && `Phone: ${customer.phone}`}
                            {customer.email && ` • Email: ${customer.email}`}
                        </p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (printRef.current) handlePrint();
                    }}
                    className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                    <PrinterIcon className="h-4 w-4" />
                    Print
                </button>
            </div>

            {/* Stats Cards */}
            <section className="grid gap-6 md:grid-cols-3">
                {[
                    {
                        label: 'Total Sales',
                        value: `৳${(displayStats?.totalSales || 0).toLocaleString()}`,
                        color: 'blue',
                        icon: '💰',
                        subtitle: 'Total sales amount'
                    },
                    {
                        label: 'Total Paid',
                        value: `৳${(displayStats?.totalPaid || 0).toLocaleString()}`,
                        color: 'green',
                        icon: '💵',
                        subtitle: 'Amount collected'
                    },
                    {
                        label: 'Total Due',
                        value: `৳${(displayStats?.totalDue || 0).toLocaleString()}`,
                        color: 'red',
                        icon: '⏳',
                        subtitle: 'Outstanding balance'
                    },
                ].map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-gradient-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${card.color === 'green' ? 'text-green-600' :
                                    card.color === 'red' ? 'text-red-600' : 'text-blue-600'
                                } group-hover:scale-105 transition-transform duration-300`}>
                                    {card.value}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{card.subtitle}</p>
                            </div>
                            <div className={`rounded-sm p-2 ${card.color === 'green' ? 'bg-green-100' :
                                card.color === 'red' ? 'bg-red-100' : 'bg-blue-100'
                            } opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
                                <div className={`h-2 w-2 rounded-sm ${card.color === 'green' ? 'bg-green-500' :
                                    card.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                                }`}></div>
                            </div>
                        </div>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 print:hidden ${card.color === 'green' ? 'bg-green-500' :
                            card.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                        }`}></div>
                    </div>
                ))}
            </section>

            {/* Search and Date Filter */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="relative flex-1 max-w-md">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search by order number..."
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

            {/* Printable Content */}
            <div ref={printRef} className="print-container">
                <section className="rounded-sm border border-white/70 bg-white/90 p-4 shadow-card">
                    <h3 className="text-base font-bold text-slate-900 mb-3 print-section-title">Orders</h3>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-xs print-table">
                            <thead className="bg-slate-50 print:bg-white">
                                <tr>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 print-table-th">S/N</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 print-table-th">Order ID</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 print-table-th">Date</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 print-table-th">Amount</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 print-table-th">Paid</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 print-table-th">Due</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 print-table-th">Status</th>
                                    <th className="px-2 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 no-print print-table-th">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white print:divide-slate-200">
                                {filteredOrders.map((order, idx) => {
                                    const grandTotal = order.totalAmount;
                                    const actualPaidAmount = order.status === 'completed'
                                        ? grandTotal
                                        : (order.paidAmount || 0);
                                    const dueAmount = grandTotal - actualPaidAmount;

                                    return (
                                        <tr key={order._id} className="hover:bg-slate-50 print:hover:bg-white">
                                            <td className="px-2 py-2 text-slate-400 text-[10px] print-table-td">{idx + 1}</td>
                                            <td className="px-2 py-2 font-semibold text-slate-900 print-table-td">{order.orderNumber}</td>
                                            <td className="px-2 py-2 text-slate-600 print-table-td">{dayjs(order.createdAt).format('DD MMM YY')}</td>
                                            <td className="px-2 py-2 font-semibold text-slate-900 print-table-td">৳{grandTotal.toLocaleString()}</td>
                                            <td className="px-2 py-2 text-emerald-600 print-table-td">৳{actualPaidAmount.toLocaleString()}</td>
                                            <td className={`px-2 py-2 font-semibold ${dueAmount > 0 ? 'text-red-600' : 'text-emerald-600'} print-table-td`}>
                                                ৳{dueAmount.toLocaleString()}
                                            </td>
                                            <td className="px-2 py-2 print-table-td">
                                                <StatusBadge status={order.status === 'completed' ? 'paid' : order.status === 'partial' ? 'partially paid' : 'pending'} />
                                            </td>
                                            <td className="px-2 py-2 no-print print-table-td">
                                                <button
                                                    onClick={() => setViewInvoiceId(order._id)}
                                                    className="inline-flex h-7 w-7 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600"
                                                    title="View & Print Invoice"
                                                >
                                                    <EyeIcon className="h-3.5 w-3.5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {filteredOrders.length === 0 && (
                            <div className="py-8 text-center text-sm text-slate-500">No orders found</div>
                        )}
                    </div>
                </section>
            </div>

            {/* Payment Modal */}
            {paymentModalOpen && selectedOrderForPayment && (() => {
                const order = selectedOrderForPayment;
                const grandTotal = order.totalAmount;
                const currentPaid = order.status === 'completed' ? grandTotal : (order.paidAmount || 0);
                const dueAmount = grandTotal - currentPaid;

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-slate-900">Record Payment</h2>
                                <button
                                    onClick={() => {
                                        setPaymentModalOpen(false);
                                        setSelectedOrderForPayment(null);
                                        setPaymentAmount('');
                                    }}
                                    className="rounded-sm p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                                >
                                    <ArrowLeftIcon className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4 mb-6">
                                <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Order</p>
                                    <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Grand Total</p>
                                        <p className="font-semibold text-slate-900">৳{grandTotal.toLocaleString()}</p>
                                    </div>
                                    <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Due Amount</p>
                                        <p className="font-semibold text-red-600">৳{dueAmount.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>

                            <form onSubmit={async (e) => {
                                e.preventDefault();
                                if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
                                    alert('Please enter a valid payment amount');
                                    return;
                                }

                                const paymentValue = parseFloat(paymentAmount);
                                const newPaidAmount = currentPaid + paymentValue;
                                const newDueAmount = grandTotal - newPaidAmount;

                                let newStatus: 'pending' | 'partial' | 'completed' = 'pending';
                                if (newDueAmount <= 0) {
                                    newStatus = 'completed';
                                } else if (newPaidAmount > 0) {
                                    newStatus = 'partial';
                                }

                                try {
                                    await updateOrder({
                                        id: order._id,
                                        data: { paidAmount: newPaidAmount, status: newStatus }
                                    }).unwrap();

                                    setPaymentModalOpen(false);
                                    setSelectedOrderForPayment(null);
                                    setPaymentAmount('');
                                    refetch();
                                    alert('Payment recorded successfully!');
                                } catch (error) {
                                    console.error('Failed to record payment:', error);
                                    alert('Failed to record payment');
                                }
                            }} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Payment Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                                        <input
                                            type="number"
                                            value={paymentAmount}
                                            onChange={(e) => setPaymentAmount(e.target.value)}
                                            max={dueAmount}
                                            min="0"
                                            step="0.01"
                                            required
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                            placeholder="Enter payment amount"
                                        />
                                    </div>
                                    <p className="mt-1 text-xs text-slate-500">Maximum: ৳{dueAmount.toLocaleString()}</p>
                                </div>

                                <div className="flex gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPaymentModalOpen(false);
                                            setSelectedOrderForPayment(null);
                                            setPaymentAmount('');
                                        }}
                                        className="flex-1 rounded-sm border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isUpdatingOrder || !paymentAmount || parseFloat(paymentAmount) <= 0}
                                        className="flex-1 rounded-sm bg-emerald-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/30 hover:shadow-xl hover:shadow-emerald-600/40 transition disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isUpdatingOrder ? 'Recording...' : 'Record Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* Invoice Modal */}
            {viewInvoiceId && (
                <InvoiceModal
                    orderId={viewInvoiceId}
                    onClose={() => setViewInvoiceId(null)}
                />
            )}
        </div>
    );
};

export default CustomerLedgerPage;
