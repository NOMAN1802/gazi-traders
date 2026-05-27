import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useReactToPrint } from 'react-to-print';
import dayjs from 'dayjs';
import {
    PencilSquareIcon,
    TrashIcon,
    EyeIcon,
    PrinterIcon,
    PlusIcon,
    Bars3Icon,
    ArrowsUpDownIcon,
    XMarkIcon,
    MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetOrdersQuery, useUpdateOrderMutation, useDeleteOrderMutation, type Order, type OrderItem } from '@/services/ordersApi';
import InvoiceModal from '@/components/invoices/InvoiceModal';
import DateRangeSelector from '@/pages/reports/DateRangeSelector';
import { usePermissions } from '@/hooks/usePermissions';


const InvoicesPage = () => {
    const { canEditDelete } = usePermissions();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
    const [showColumnDropdown, setShowColumnDropdown] = useState(false);
    const [search, setSearch] = useState(searchParams.get('search') || '');
    type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';
    const [dateRange, setDateRange] = useState<DateRangeType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [visibleColumns, setVisibleColumns] = useState({
        orderId: true,
        customer: true,
        date: true,
        amount: true,
        items: true,
        viewPrint: true,
        status: true,
        actions: true
    });

    const limit = 20;
    const [page, setPage] = useState(1);
    const [isPartialModalOpen, setIsPartialModalOpen] = useState(false);
    const [partialAmount, setPartialAmount] = useState('');
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [viewInvoiceId, setViewInvoiceId] = useState<string | null>(null);
    const isSearchInitializedRef = useRef(false);
    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isSearchInitializedRef.current) return;
        const urlSearch = searchParams.get('search');
        if (urlSearch) {
            isSearchInitializedRef.current = true;
            queueMicrotask(() => { setSearch(urlSearch); });
        }
    }, [searchParams]);

    const getDateRangeParams = useMemo(() => {
        if (dateRange === 'all') return undefined;
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

    const { data, isLoading, isError, refetch } = useGetOrdersQuery({
        sortBy: sortOrder === 'desc' ? '-createdAt' : 'createdAt',
        page,
        limit,
        search: search || undefined,
        ...(getDateRangeParams && { startDate: getDateRangeParams.startDate, endDate: getDateRangeParams.endDate }),
    });
    const { data: allOrdersData } = useGetOrdersQuery({
        limit: 10000,
        sortBy: '-createdAt',
        ...(getDateRangeParams && { startDate: getDateRangeParams.startDate, endDate: getDateRangeParams.endDate }),
    });
    const [updateOrder] = useUpdateOrderMutation();
    const [deleteOrder] = useDeleteOrderMutation();
    const invoices = data?.result ?? [];
    const allOrders = allOrdersData?.result ?? [];
    const totalPages = Math.ceil((data?.meta?.total ?? 0) / limit);

    const toggleSort = () => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
    const toggleColumn = (key: keyof typeof visibleColumns) => setVisibleColumns(prev => ({ ...prev, [key]: !prev[key] }));

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Sales_${dayjs().format('YYYY-MM-DD')}`,
    });

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 10;
        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            if (page <= 6) {
                for (let i = 1; i <= maxVisible; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 5) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - (maxVisible - 1); i <= totalPages; i++) pages.push(i);
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 2; i <= page + 2; i++) pages.push(i);
                pages.push('...');
                pages.push(totalPages);
            }
        }
        return pages;
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        const order = invoices.find(inv => inv._id === id);
        if (order) {
            if (order.status === 'completed') {
                alert('Cannot change status of a completed order');
                return;
            }
            if (order.status === 'partial' && newStatus === 'pending') {
                alert('Cannot change partial order back to unpaid');
                return;
            }
            if (order.status === 'partial' && newStatus === 'partial') {
                setSelectedOrderId(id);
                setPartialAmount('');
                setIsPartialModalOpen(true);
                return;
            }
        }
        if (newStatus === 'partial') {
            setSelectedOrderId(id);
            setPartialAmount('');
            setIsPartialModalOpen(true);
            return;
        }
        try {
            await updateOrder({ id, data: { status: newStatus as 'pending' | 'completed' | 'partial' } }).unwrap();
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update status');
        }
    };

    const handlePartialSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedOrderId || !partialAmount) return;

        const additionalAmount = parseFloat(partialAmount);
        if (isNaN(additionalAmount) || additionalAmount <= 0) {
            alert("Invalid amount entered. Amount must be greater than 0");
            return;
        }

        const order = invoices.find(inv => inv._id === selectedOrderId);
        if (!order) {
            alert("Order not found");
            return;
        }

        const grandTotal = order.totalAmount;
        const currentPaidAmount = order.paidAmount || 0;
        const newPaidAmount = currentPaidAmount + additionalAmount;

        if (newPaidAmount > grandTotal) {
            alert(`Payment amount exceeds the grand total of ৳${grandTotal.toLocaleString()}. Maximum additional payment: ৳${(grandTotal - currentPaidAmount).toLocaleString()}`);
            return;
        }

        const newDueAmount = grandTotal - newPaidAmount;
        const newStatus: 'partial' | 'completed' = newDueAmount <= 0 ? 'completed' : 'partial';

        try {
            await updateOrder({ id: selectedOrderId, data: { status: newStatus, paidAmount: newPaidAmount } }).unwrap();
            setIsPartialModalOpen(false);
            setSelectedOrderId(null);
            setPartialAmount('');
            refetch();
        } catch (err) {
            console.error('Failed to update status', err);
            alert('Failed to update payment');
        }
    };

    const handleDelete = async (id: string) => {
        const order = invoices.find(inv => inv._id === id);
        if (order && isDeleteDisabled(order)) {
            if (order.status === 'completed') alert('Cannot delete a completed order');
            else if (order.status === 'partial') alert('Cannot delete a partial order');
            return;
        }
        if (confirm('Are you sure you want to delete this order?')) {
            try {
                await deleteOrder(id).unwrap();
            } catch (err) {
                console.error('Failed to delete', err);
                alert('Failed to delete order');
            }
        }
    };

    const isOrderFullyProtected = (order: Order): boolean => order.status === 'completed';
    const isDeleteDisabled = (order: Order): boolean => order.status === 'completed' || order.status === 'partial';

    if (isLoading) return <Loader fullScreen message="Syncing sales..." />;
    if (isError) return <ErrorState description="Unable to fetch sales" onRetry={refetch} />;

    const ordersToPrint = allOrders;
    const totalSalesCount = ordersToPrint.length;
    const totalSalesAmount = ordersToPrint.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return (
        <>
            {/* Hidden printable content */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                <div ref={printRef} className="bg-white" style={{ width: '210mm', padding: '20mm', fontFamily: 'Arial, sans-serif' }}>
                    <style>{`
                        @media print {
                            @page { size: A4; margin: 0; }
                            body { margin: 0; padding: 0; }
                        }
                        .print-container { width: 100%; max-width: 100%; }
                        .print-header { border-bottom: 3px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px; }
                        .print-title { font-size: 28px; font-weight: 700; color: #0f172a; margin: 0 0 8px 0; letter-spacing: -0.5px; }
                        .print-subtitle { font-size: 14px; color: #64748b; margin: 4px 0; }
                        .print-info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 20px; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .print-info-item { display: flex; flex-direction: column; }
                        .print-info-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
                        .print-info-value { font-size: 14px; font-weight: 600; color: #0f172a; }
                        .print-table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 11px; }
                        .print-table thead { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; }
                        .print-table th { padding: 12px 8px; text-align: left; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; border: 1px solid #334155; }
                        .print-table th.text-center { text-align: center; }
                        .print-table th.text-right { text-align: right; }
                        .print-table tbody tr { border-bottom: 1px solid #e2e8f0; }
                        .print-table tbody tr:nth-child(even) { background-color: #f8fafc; }
                        .print-table td { padding: 10px 8px; color: #334155; border: 1px solid #e2e8f0; }
                        .print-table td.text-center { text-align: center; }
                        .print-table td.text-right { text-align: right; }
                        .print-table .order-id { font-weight: 600; color: #0f172a; }
                        .print-table .total-row { background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important; font-weight: 700; border-top: 2px solid #16a34a; }
                        .print-table .total-row td { padding: 12px 8px; color: #0f172a; border: 1px solid #86efac; }
                        .print-table .total-amount { color: #16a34a; font-size: 13px; }
                        .print-summary { margin-top: 30px; padding: 20px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border: 2px solid #e2e8f0; }
                        .print-summary-title { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #cbd5e1; }
                        .print-summary-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
                        .print-summary-item { text-align: center; }
                        .print-summary-label { font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px; }
                        .print-summary-value { font-size: 20px; font-weight: 700; color: #0f172a; }
                        .print-footer { margin-top: 30px; padding-top: 15px; border-top: 2px solid #e2e8f0; text-align: center; font-size: 10px; color: #94a3b8; }
                    `}</style>
                    {ordersToPrint.length > 0 ? (
                        <div className="print-container">
                            <div className="print-header">
                                <h1 className="print-title">Sales Report</h1>
                                <p className="print-subtitle">Generated on: {dayjs().format('DD MMMM YYYY [at] hh:mm A')}</p>
                                <div className="print-info-grid">
                                    <div className="print-info-item">
                                        <span className="print-info-label">Total Sales</span>
                                        <span className="print-info-value">{totalSalesCount}</span>
                                    </div>
                                    <div className="print-info-item">
                                        <span className="print-info-label">Total Amount</span>
                                        <span className="print-info-value">৳{totalSalesAmount.toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                            <table className="print-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '10%' }}>Date</th>
                                        <th style={{ width: '12%' }}>Order #</th>
                                        <th style={{ width: '15%' }}>Distributor</th>
                                        <th style={{ width: '22%' }}>Product</th>
                                        <th className="text-center" style={{ width: '8%' }}>Qty</th>
                                        <th className="text-right" style={{ width: '10%' }}>Unit Price</th>
                                        <th className="text-right" style={{ width: '10%' }}>Total</th>
                                        <th style={{ width: '13%' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {ordersToPrint.flatMap((order) => {
                                        const items = order.items && order.items.length > 0 ? order.items : [];
                                        const customerName = order.customer?.name ?? 'Walk-in';
                                        const statusLabel = order.status === 'completed' ? 'Paid' : order.status === 'partial' ? 'Partial' : 'Unpaid';
                                        return items.length > 0
                                            ? items.map((item: OrderItem, itemIndex: number) => (
                                                <tr key={`${order._id}-${itemIndex}`}>
                                                    {itemIndex === 0 && (
                                                        <>
                                                            <td rowSpan={items.length}>{order.createdAt ? dayjs(order.createdAt).format('DD MMM YYYY') : 'N/A'}</td>
                                                            <td rowSpan={items.length} className="order-id">{order.orderNumber}</td>
                                                            <td rowSpan={items.length}>{customerName}</td>
                                                        </>
                                                    )}
                                                    <td>{item.productName || 'N/A'}</td>
                                                    <td className="text-center">{item.quantity ?? 0}</td>
                                                    <td className="text-right">৳{(item.unitPrice ?? 0).toLocaleString()}</td>
                                                    <td className="text-right">৳{(item.totalPrice ?? 0).toLocaleString()}</td>
                                                    {itemIndex === 0 && <td rowSpan={items.length}>{statusLabel}</td>}
                                                </tr>
                                            ))
                                            : [
                                                <tr key={order._id}>
                                                    <td>{order.createdAt ? dayjs(order.createdAt).format('DD MMM YYYY') : 'N/A'}</td>
                                                    <td className="order-id">{order.orderNumber}</td>
                                                    <td>{customerName}</td>
                                                    <td>—</td>
                                                    <td className="text-center">0</td>
                                                    <td className="text-right">—</td>
                                                    <td className="text-right">৳{(order.totalAmount ?? 0).toLocaleString()}</td>
                                                    <td>{statusLabel}</td>
                                                </tr>
                                              ];
                                    })}
                                    <tr className="total-row">
                                        <td colSpan={4} className="text-right" style={{ fontSize: '12px', fontWeight: 700 }}>TOTAL:</td>
                                        <td></td>
                                        <td></td>
                                        <td className="text-right total-amount">৳{totalSalesAmount.toLocaleString()}</td>
                                        <td></td>
                                    </tr>
                                </tbody>
                            </table>
                            <div className="print-summary">
                                <div className="print-summary-title">Summary</div>
                                <div className="print-summary-grid">
                                    <div className="print-summary-item">
                                        <div className="print-summary-label">Total Sales</div>
                                        <div className="print-summary-value">{totalSalesCount}</div>
                                    </div>
                                    <div className="print-summary-item">
                                        <div className="print-summary-label">Total Amount</div>
                                        <div className="print-summary-value" style={{ color: '#16a34a' }}>৳{totalSalesAmount.toLocaleString()}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="print-footer">
                                <p>This is a computer-generated report. No signature is required.</p>
                                <p style={{ marginTop: '5px' }}>গাজী ট্রেডার্স Inventory Management System</p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Sale Management</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Sales</h1>
                    <p className="text-sm text-slate-500">Track pending, completed, and partial sales with stock management.</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                            placeholder="Search sales..."
                            className="w-64 rounded-sm border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-600 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <button
                        onClick={() => navigate('/invoices/create')}
                        className="inline-flex items-center gap-2 rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Create Sale
                    </button>
                </div>
            </header>

            <DateRangeSelector
                dateRange={dateRange}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                onDateRangeChange={(range) => {
                    setDateRange(range);
                    if (range !== 'custom') { setCustomStartDate(''); setCustomEndDate(''); }
                    setPage(1);
                }}
                onCustomStartDateChange={setCustomStartDate}
                onCustomEndDateChange={setCustomEndDate}
                onApplyCustomRange={() => {
                    if (customStartDate && customEndDate) { setDateRange('custom'); setPage(1); }
                }}
            />

            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[
                    { label: 'Total Sales', value: allOrdersData?.meta?.total ?? 0, delta: '+5.62%', color: 'blue', icon: '📊' },
                    { label: 'Completed Sales', value: allOrders.filter((o) => o.status === 'completed').length, delta: '+2.14%', color: 'emerald', icon: '✅' },
                    {
                        label: 'Unpaid Amount',
                        value: `৳${allOrders.filter(o => o.status === 'pending' || o.status === 'partial').reduce((sum, o) => {
                            if (o.status === 'pending') return sum + (o.totalAmount || 0);
                            return sum + Math.max(0, (o.totalAmount || 0) - (o.paidAmount || 0));
                        }, 0).toLocaleString()}`,
                        delta: '-1.12%', color: 'amber', icon: '⏳'
                    },
                    { label: 'Total Sale Value', value: `৳${allOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0).toLocaleString()}`, delta: '+8.24%', color: 'purple', icon: '💰' },
                ].map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${card.color === 'emerald' ? 'text-emerald-600' : card.color === 'amber' ? 'text-amber-600' : card.color === 'purple' ? 'text-purple-600' : 'text-blue-600'} group-hover:scale-105 transition-transform duration-300`}>
                                    {card.value}
                                </p>
                            </div>
                            <div className={`rounded-sm p-2 ${card.color === 'emerald' ? 'bg-emerald-100' : card.color === 'amber' ? 'bg-amber-100' : card.color === 'purple' ? 'bg-purple-100' : 'bg-blue-100'} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
                                <div className={`h-2 w-2 rounded-sm ${card.color === 'emerald' ? 'bg-emerald-500' : card.color === 'amber' ? 'bg-amber-500' : card.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center">
                            <span className={`text-xs font-semibold ${card.delta.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>{card.delta}</span>
                            <span className="ml-1 text-xs text-slate-400">vs last month</span>
                        </div>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${card.color === 'emerald' ? 'bg-emerald-500' : card.color === 'amber' ? 'bg-amber-500' : card.color === 'purple' ? 'bg-purple-500' : 'bg-blue-500'}`}></div>
                    </div>
                ))}
            </section>

            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold uppercase tracking-widest text-slate-500">All Sales</p>
                    <div className="flex gap-3 relative">
                        <button
                            type="button"
                            onClick={() => handlePrint()}
                            className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors print:hidden"
                        >
                            <PrinterIcon className="h-4 w-4" />
                            Print
                        </button>
                        <div className="relative print:hidden">
                            <button
                                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                                className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                            >
                                <Bars3Icon className="h-4 w-4" />
                                Columns
                            </button>
                            {showColumnDropdown && (
                                <div className="absolute right-0 top-full z-10 mt-2 w-48 rounded-sm border border-slate-100 bg-white p-2 shadow-lg ring-1 ring-black/5">
                                    {Object.entries({
                                        orderId: 'Order ID',
                                        customer: 'Distributor',
                                        date: 'Created On',
                                        amount: 'Amount',
                                        items: 'Items',
                                        viewPrint: 'View/Print',
                                        status: 'Change Status',
                                        actions: 'Actions'
                                    }).map(([key, label]) => (
                                        <label key={key} className="flex cursor-pointer items-center gap-2 rounded-sm px-3 py-2 hover:bg-slate-50">
                                            <input
                                                type="checkbox"
                                                checked={visibleColumns[key as keyof typeof visibleColumns]}
                                                onChange={() => toggleColumn(key as keyof typeof visibleColumns)}
                                                className="rounded border-slate-300 text-brand focus:ring-brand"
                                            />
                                            <span className="text-sm text-slate-700">{label}</span>
                                        </label>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button
                            type="button"
                            onClick={toggleSort}
                            className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors print:hidden"
                        >
                            <ArrowsUpDownIcon className="h-4 w-4" />
                            {sortOrder === 'desc' ? 'Latest First' : 'Oldest First'}
                        </button>
                    </div>
                </div>

                <div className="mt-6 overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                        <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-2.5 pr-4">S/N</th>
                                {visibleColumns.orderId && <th className="py-2.5 pr-4">Order ID</th>}
                                {visibleColumns.customer && <th className="py-2.5 pr-4">Distributor</th>}
                                {visibleColumns.date && <th className="py-2.5 pr-4">Created On</th>}
                                {visibleColumns.amount && <th className="py-2.5 pr-4">Amount</th>}
                                {visibleColumns.items && <th className="py-2.5 pr-4">Items</th>}
                                {visibleColumns.viewPrint && <th className="py-2.5 pr-4">View/Print</th>}
                                {visibleColumns.status && <th className="py-2.5 pr-4">Change Status</th>}
                                {visibleColumns.actions && <th className="py-2.5">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {invoices.map((invoice, idx) => {
                                const paidAmount = invoice.status === 'completed'
                                    ? invoice.totalAmount
                                    : (invoice.paidAmount || 0);
                                const dueAmount = invoice.totalAmount - paidAmount;

                                return (
                                    <tr key={invoice._id} className="transition hover:bg-slate-50/60">
                                        <td className="py-2.5 pr-4 text-slate-400">{(page - 1) * limit + idx + 1}</td>
                                        {visibleColumns.orderId && (
                                            <td className="py-2.5 pr-4 font-semibold text-slate-900">{invoice.orderNumber}</td>
                                        )}
                                        {visibleColumns.customer && (
                                            <td className="py-2.5 pr-4 font-medium text-slate-900">{invoice.customer?.name ?? 'Walk-in'}</td>
                                        )}
                                        {visibleColumns.date && (
                                            <td className="py-2.5 pr-4 text-slate-500">{dayjs(invoice.createdAt).format('DD MMM YYYY')}</td>
                                        )}
                                        {visibleColumns.amount && (
                                            <td className="py-2.5 pr-4">
                                                <div className="font-semibold text-slate-900">
                                                    ৳{invoice.totalAmount.toLocaleString()}
                                                </div>
                                                <div className="text-xs font-medium text-slate-500 mt-0.5">
                                                    Paid: <span className={
                                                        invoice.status === 'completed' ? 'text-emerald-600' :
                                                            invoice.status === 'partial' ? 'text-blue-600' :
                                                                'text-slate-400'
                                                    }>
                                                        ৳{paidAmount.toLocaleString()}
                                                    </span>
                                                </div>
                                                {dueAmount > 0 && (
                                                    <div className="text-xs text-red-500 mt-0.5">
                                                        Due: ৳{dueAmount.toLocaleString()}
                                                    </div>
                                                )}
                                            </td>
                                        )}
                                        {visibleColumns.items && (
                                            <td className="py-2.5 pr-4 text-slate-700">
                                                <div>{invoice.items?.length || 0} items</div>
                                            </td>
                                        )}
                                        {visibleColumns.viewPrint && (
                                            <td className="py-2.5 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => setViewInvoiceId(invoice._id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                                                        title="View Order"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => setViewInvoiceId(invoice._id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600"
                                                        title="Print Invoice"
                                                    >
                                                        <PrinterIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.status && (
                                            <td className="py-2.5 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <select
                                                        value={invoice.status}
                                                        onChange={(e) => handleStatusChange(invoice._id, e.target.value)}
                                                        disabled={isOrderFullyProtected(invoice)}
                                                        className={`h-8 rounded-sm border-slate-200 text-xs font-semibold uppercase tracking-wider focus:ring-2 focus:ring-brand/20 ${isOrderFullyProtected(invoice)
                                                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200'
                                                            : invoice.status === 'completed'
                                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                                                : invoice.status === 'pending'
                                                                    ? 'bg-amber-50 text-amber-600 border-amber-200'
                                                                    : invoice.status === 'partial'
                                                                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                                        : 'bg-red-50 text-red-600 border-red-200'
                                                            }`}
                                                    >
                                                        {invoice.status === 'pending' && (
                                                            <>
                                                                <option value="pending">Unpaid</option>
                                                                <option value="partial">Partial</option>
                                                                <option value="completed">Paid</option>
                                                            </>
                                                        )}
                                                        {invoice.status === 'partial' && (
                                                            <>
                                                                <option value="partial">Partial</option>
                                                                <option value="completed">Paid</option>
                                                            </>
                                                        )}
                                                        {invoice.status === 'completed' && (
                                                            <option value="completed">Paid</option>
                                                        )}
                                                    </select>
                                                    {invoice.status === 'partial' && dueAmount > 0 && (
                                                        <button
                                                            onClick={() => {
                                                                setSelectedOrderId(invoice._id);
                                                                setPartialAmount('');
                                                                setIsPartialModalOpen(true);
                                                            }}
                                                            className="inline-flex items-center gap-1 rounded-sm bg-blue-50 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-100 border border-blue-200 transition-colors"
                                                            title="Add Payment"
                                                        >
                                                            + Add
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                        {visibleColumns.actions && (
                                            <td className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => navigate(`/invoices/edit/${invoice._id}`)}
                                                        disabled={isOrderFullyProtected(invoice) || !canEditDelete}
                                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-sm border transition-all ${isOrderFullyProtected(invoice) || !canEditDelete
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                                                            : 'border-slate-200 text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600'
                                                            }`}
                                                        title={!canEditDelete ? 'No permission' : isOrderFullyProtected(invoice) ? 'Cannot edit completed order' : 'Edit Order'}
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(invoice._id)}
                                                        disabled={isDeleteDisabled(invoice) || !canEditDelete}
                                                        className={`inline-flex h-8 w-8 items-center justify-center rounded-sm border transition-all ${isDeleteDisabled(invoice) || !canEditDelete
                                                            ? 'border-gray-200 text-gray-300 cursor-not-allowed bg-gray-50'
                                                            : 'border-slate-200 text-slate-600 hover:bg-red-50 hover:border-red-300 hover:text-red-600'
                                                            }`}
                                                        title={!canEditDelete ? 'No permission' : isDeleteDisabled(invoice) ? 'Cannot delete paid/partial order' : 'Delete Order'}
                                                    >
                                                        <TrashIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row">
                    <div className="text-sm text-slate-600">
                        Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
                        <span className="font-semibold text-slate-900">{Math.min(page * limit, data?.meta?.total ?? 0)}</span>{' '}
                        of <span className="font-semibold text-slate-900">{data?.meta?.total ?? 0}</span> entries
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => handlePageChange(page - 1)} disabled={page === 1} className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
                            Previous
                        </button>
                        <div className="flex items-center gap-1">
                            {getPageNumbers().map((pageNum, idx) => (
                                pageNum === '...' ? (
                                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400">...</span>
                                ) : (
                                    <button
                                        key={pageNum}
                                        onClick={() => handlePageChange(pageNum as number)}
                                        className={`flex h-9 min-w-[36px] items-center justify-center rounded-sm px-3 text-sm font-semibold transition-all ${page === pageNum ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        {pageNum}
                                    </button>
                                )
                            ))}
                        </div>
                        <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages} className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent">
                            Next
                        </button>
                    </div>
                </div>
            </section>

            {/* Partial Payment Modal */}
            {isPartialModalOpen && selectedOrderId && (() => {
                const order = invoices.find(inv => inv._id === selectedOrderId);
                if (!order) return null;

                const grandTotal = order.totalAmount;
                const currentPaidAmount = order.paidAmount || 0;
                const dueAmount = grandTotal - currentPaidAmount;
                const additionalAmount = partialAmount ? parseFloat(partialAmount) : 0;
                const maxAdditionalAmount = Math.max(0, dueAmount);

                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                        <div className="w-full max-w-md rounded-sm bg-white p-6 shadow-2xl">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-xl font-bold text-slate-900">
                                    {order.status === 'partial' ? 'Add Payment' : 'Partial Payment'}
                                </h3>
                                <button
                                    onClick={() => { setIsPartialModalOpen(false); setSelectedOrderId(null); setPartialAmount(''); }}
                                    className="rounded-sm p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                >
                                    <XMarkIcon className="h-6 w-6" />
                                </button>
                            </div>
                            <form onSubmit={handlePartialSubmit}>
                                <div className="mb-4 space-y-3">
                                    <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                                        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Order</p>
                                        <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Grand Total</p>
                                            <p className="font-semibold text-slate-900">৳{grandTotal.toLocaleString()}</p>
                                        </div>
                                        <div className="rounded-sm border border-slate-200 bg-slate-50 p-4">
                                            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Due Amount</p>
                                            <p className="font-semibold text-red-600">৳{dueAmount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                    {order.status === 'partial' && (
                                        <div className="rounded-sm border border-slate-200 bg-blue-50 p-4">
                                            <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Already Paid</p>
                                            <p className="font-semibold text-blue-600">৳{currentPaidAmount.toLocaleString()}</p>
                                        </div>
                                    )}
                                    {additionalAmount > 0 && (
                                        <div className="rounded-sm border border-slate-200 bg-emerald-50 p-4">
                                            <p className="text-xs text-emerald-600 uppercase tracking-wider mb-1">New Total Paid</p>
                                            <p className="font-semibold text-emerald-600">৳{(currentPaidAmount + additionalAmount).toLocaleString()}</p>
                                        </div>
                                    )}
                                </div>
                                <div className="mb-6">
                                    <label className="mb-2 block text-sm font-medium text-slate-700">
                                        {order.status === 'partial' ? 'Additional Payment Amount (৳)' : 'Payment Amount (৳)'}
                                    </label>
                                    <input
                                        type="number"
                                        value={partialAmount}
                                        onChange={(e) => setPartialAmount(e.target.value)}
                                        placeholder="Enter amount"
                                        className="w-full rounded-sm border border-slate-200 px-4 py-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                                        autoFocus
                                        min="0"
                                        max={maxAdditionalAmount}
                                        step="0.01"
                                        required
                                    />
                                    <p className="mt-1 text-xs text-slate-500">
                                        Maximum: ৳{maxAdditionalAmount.toLocaleString()}
                                        {order.status === 'partial' && ` (Remaining due amount)`}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => { setIsPartialModalOpen(false); setSelectedOrderId(null); setPartialAmount(''); }}
                                        className="flex-1 rounded-sm border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!partialAmount || additionalAmount <= 0 || additionalAmount > maxAdditionalAmount}
                                        className="flex-1 rounded-sm bg-brand px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:shadow-xl hover:shadow-brand/40 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {order.status === 'partial' ? 'Add Payment' : 'Confirm Payment'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                );
            })()}

            {/* View Invoice Modal */}
            {viewInvoiceId && (
                <InvoiceModal
                    orderId={viewInvoiceId}
                    onClose={() => setViewInvoiceId(null)}
                />
            )}
            </div>
        </>
    );
};

export default InvoicesPage;
