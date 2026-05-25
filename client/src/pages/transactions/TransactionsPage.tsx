import { useState, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    ArrowDownTrayIcon,
    BanknotesIcon,
    ShoppingBagIcon,
    ArrowPathIcon,
    PlusIcon,
    XMarkIcon,
    PrinterIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetExpensesQuery, useCreateExpenseMutation, useUpdateExpenseMutation } from '@/services/expensesApi';
import type { Expense, ExpenseCategory } from '@/services/expensesApi';
import DateRangeSelector from '@/pages/reports/DateRangeSelector';
import { usePermissions } from '@/hooks/usePermissions';

type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const TransactionsPage = () => {
    const { canEditDelete } = usePermissions();
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTxn, setEditingTxn] = useState<Expense | null>(null);
    const [page, setPage] = useState(1);
    const [dateRange, setDateRange] = useState<DateRangeType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const printRef = useRef<HTMLDivElement>(null);
    const limit = 20;

    // Calculate date range based on selection
    const getDateRangeParams = useMemo(() => {
        if (dateRange === 'all') {
            return null; // No date filtering for 'all'
        }

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

    // Fetch all transactions when filtering by category or date, otherwise use pagination
    const shouldFetchAll = categoryFilter || (dateRange !== 'all' && getDateRangeParams !== null);

    const { data, isLoading, isError, refetch } = useGetExpensesQuery({
        search: searchTerm,
        category: categoryFilter || undefined,
        page: shouldFetchAll ? 1 : page,
        limit: shouldFetchAll ? 10000 : limit,
        ...(getDateRangeParams ? getDateRangeParams : {}),
    });

    const [createExpense, { isLoading: isCreating }] = useCreateExpenseMutation();
    const [updateExpense, { isLoading: isUpdating }] = useUpdateExpenseMutation();

    const allTransactions = useMemo(() => data?.result ?? [], [data?.result]);

    // Filter transactions by date range (client-side when date filter is active)
    const filteredTransactions = useMemo(() => {
        let filtered = allTransactions;

        // Filter by date range (only if not 'all')
        if (dateRange !== 'all' && getDateRangeParams) {
            const { startDate, endDate } = getDateRangeParams;
            filtered = filtered.filter((txn) => {
                if (!txn.date) return false;
                const txnDate = dayjs(txn.date);
                return txnDate.isAfter(dayjs(startDate).subtract(1, 'day')) && 
                       txnDate.isBefore(dayjs(endDate).add(1, 'day'));
            });
        }

        return filtered;
    }, [allTransactions, dateRange, getDateRangeParams]);

    // Calculate total pages based on whether filtering is active
    const totalPages = useMemo(() => {
        const hasFilters = categoryFilter || dateRange !== 'all';
        if (hasFilters) {
            return Math.ceil(filteredTransactions.length / limit);
        }
        return Math.ceil((data?.meta?.total ?? 0) / limit);
    }, [categoryFilter, dateRange, filteredTransactions.length, data?.meta?.total, limit]);

    // Paginate transactions for display
    const paginatedTransactions = useMemo(() => {
        const hasFilters = categoryFilter || dateRange !== 'all';
        if (!hasFilters) {
            // If no filter, use the transactions from API (already paginated by backend)
            return allTransactions;
        }
        // If filtered, paginate the filtered results client-side
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        return filteredTransactions.slice(startIndex, endIndex);
    }, [allTransactions, filteredTransactions, categoryFilter, dateRange, page, limit]);

    const transactions = paginatedTransactions;

    const getCategoryBadge = (category: ExpenseCategory) => {
        const styles: Record<string, string> = {
            product_purchase: 'bg-blue-50 text-blue-700 border-blue-200',
            refund: 'bg-orange-50 text-orange-700 border-orange-200',
            salaries: 'bg-purple-50 text-purple-700 border-purple-200',
            rent: 'bg-indigo-50 text-indigo-700 border-indigo-200',
            default: 'bg-slate-50 text-slate-700 border-slate-200',
        };

        const labels: Record<string, string> = {
            product_purchase: 'Purchase',
            refund: 'Refund',
            rent: 'Rent',
            utilities: 'Utilities',
            supplies: 'Supplies',
            salaries: 'Salary',
            other: 'Other',
        };

        return (
            <span
                className={`inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-semibold ${styles[category] || styles.default
                    }`}
            >
                {labels[category] || category}
            </span>
        );
    };

    const getIcon = (category: ExpenseCategory) => {
        if (category === 'product_purchase') return <ShoppingBagIcon className="h-5 w-5 text-blue-500" />;
        if (category === 'refund') return <ArrowPathIcon className="h-5 w-5 text-orange-500" />;
        return <BanknotesIcon className="h-5 w-5 text-slate-500" />;
    };

    const getCategoryLabel = (category: ExpenseCategory) => {
        const labels: Record<string, string> = {
            product_purchase: 'Purchase',
            refund: 'Refund',
            rent: 'Rent',
            utilities: 'Utilities',
            supplies: 'Supplies',
            salaries: 'Salary',
            other: 'Other',
        };
        return labels[category] || category;
    };

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Transactions-${dayjs().format('YYYY-MM-DD')}`,
    });

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        const maxVisible = 10;

        if (totalPages === 0) {
            pages.push(1);
            return pages;
        }

        if (totalPages <= maxVisible) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (page <= 6) {
                for (let i = 1; i <= maxVisible; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            } else if (page >= totalPages - 5) {
                pages.push(1);
                pages.push('...');
                for (let i = totalPages - (maxVisible - 1); i <= totalPages; i++) {
                    pages.push(i);
                }
            } else {
                pages.push(1);
                pages.push('...');
                for (let i = page - 2; i <= page + 2; i++) {
                    pages.push(i);
                }
                pages.push('...');
                pages.push(totalPages);
            }
        }

        return pages;
    };

    const handleExportLedger = () => {
        if (transactions.length === 0) {
            alert('No transactions to export');
            return;
        }

        // Create CSV headers
        const headers = ['Transaction', 'Category', 'Date', 'Amount', 'Description'];

        // Create CSV rows
        const rows = transactions.map((txn) => [
            txn.title,
            getCategoryLabel(txn.category),
            dayjs(txn.date).format('DD MMM YYYY'),
            `৳${txn.amount.toLocaleString()}`,
            txn.description || 'No description',
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
        ].join('\n');

        // Create blob and download
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `ledger_export_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.csv`);
        link.style.visibility = 'hidden';

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
    };

    const handleUpdateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingTxn) return;
        const formData = new FormData(e.currentTarget);
        try {
            await updateExpense({
                id: editingTxn._id,
                data: {
                    title: formData.get('title') as string,
                    category: formData.get('category') as ExpenseCategory,
                    amount: Number(formData.get('amount')),
                    date: new Date(formData.get('date') as string).toISOString(),
                    description: formData.get('description') as string,
                },
            }).unwrap();
            setEditingTxn(null);
        } catch (error) {
            console.error('Failed to update transaction:', error);
        }
    };

    const handleCreateExpense = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);

        try {
            await createExpense({
                title: formData.get('title') as string,
                category: formData.get('category') as ExpenseCategory,
                amount: Number(formData.get('amount')),
                date: new Date(formData.get('date') as string).toISOString(),
                description: formData.get('description') as string,
            }).unwrap();
            setIsModalOpen(false);
        } catch (error) {
            console.error('Failed to create expense:', error);
            // Optionally add toast here
        }
    };

    if (isLoading) return <Loader fullScreen message="Loading transactions..." />;
    if (isError) return <ErrorState description="Unable to load transactions" onRetry={refetch} />;

    // Calculate totals for print
    const hasFilters = categoryFilter || dateRange !== 'all';
    const transactionsToPrint = hasFilters ? filteredTransactions : allTransactions;
    const totalTransactions = transactionsToPrint.length;
    const totalAmount = transactionsToPrint.reduce((sum, txn) => sum + (txn.amount || 0), 0);
    const dateRangeDisplay = dateRange === 'custom' && customStartDate && customEndDate
        ? `${dayjs(customStartDate).format('DD MMM YYYY')} - ${dayjs(customEndDate).format('DD MMM YYYY')}`
        : dateRange.charAt(0).toUpperCase() + dateRange.slice(1);

    return (
        <>
            {/* Hidden printable content */}
            <div style={{ position: 'absolute', left: '-9999px', top: 0, width: '210mm' }}>
                <div ref={printRef} className="bg-white" style={{ width: '210mm', padding: '20mm', fontFamily: 'Arial, sans-serif' }}>
                    <style>{`
                        @media print {
                            @page {
                                size: A4;
                                margin: 0;
                            }
                            body {
                                margin: 0;
                                padding: 0;
                            }
                        }
                        .print-container {
                            width: 100%;
                            max-width: 100%;
                        }
                        .print-header {
                            border-bottom: 3px solid #1e293b;
                            padding-bottom: 15px;
                            margin-bottom: 25px;
                        }
                        .print-title {
                            font-size: 28px;
                            font-weight: 700;
                            color: #0f172a;
                            margin: 0 0 8px 0;
                            letter-spacing: -0.5px;
                        }
                        .print-subtitle {
                            font-size: 14px;
                            color: #64748b;
                            margin: 4px 0;
                        }
                        .print-info-grid {
                            display: grid;
                            grid-template-columns: 1fr 1fr;
                            gap: 15px;
                            margin-top: 20px;
                            padding: 15px;
                            background: #f8fafc;
                            border-radius: 8px;
                            border: 1px solid #e2e8f0;
                        }
                        .print-info-item {
                            display: flex;
                            flex-direction: column;
                        }
                        .print-info-label {
                            font-size: 11px;
                            font-weight: 600;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 4px;
                        }
                        .print-info-value {
                            font-size: 14px;
                            font-weight: 600;
                            color: #0f172a;
                        }
                        .print-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-top: 20px;
                            font-size: 11px;
                        }
                        .print-table thead {
                            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
                            color: white;
                        }
                        .print-table th {
                            padding: 12px 8px;
                            text-align: left;
                            font-weight: 600;
                            font-size: 10px;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            border: 1px solid #334155;
                        }
                        .print-table th.text-right {
                            text-align: right;
                        }
                        .print-table tbody tr {
                            border-bottom: 1px solid #e2e8f0;
                            transition: background-color 0.2s;
                        }
                        .print-table tbody tr:nth-child(even) {
                            background-color: #f8fafc;
                        }
                        .print-table tbody tr:hover {
                            background-color: #f1f5f9;
                        }
                        .print-table td {
                            padding: 10px 8px;
                            color: #334155;
                            border: 1px solid #e2e8f0;
                        }
                        .print-table td.text-right {
                            text-align: right;
                        }
                        .print-table .transaction-title {
                            font-weight: 600;
                            color: #0f172a;
                        }
                        .print-table .amount {
                            font-weight: 600;
                            color: #0f172a;
                        }
                        .print-table .total-row {
                            background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
                            font-weight: 700;
                            border-top: 2px solid #16a34a;
                        }
                        .print-table .total-row td {
                            padding: 12px 8px;
                            color: #0f172a;
                            border: 1px solid #86efac;
                        }
                        .print-table .total-amount {
                            color: #16a34a;
                            font-size: 13px;
                        }
                        .print-summary {
                            margin-top: 30px;
                            padding: 20px;
                            background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                            border-radius: 8px;
                            border: 2px solid #e2e8f0;
                        }
                        .print-summary-title {
                            font-size: 16px;
                            font-weight: 700;
                            color: #0f172a;
                            margin-bottom: 15px;
                            padding-bottom: 10px;
                            border-bottom: 2px solid #cbd5e1;
                        }
                        .print-summary-grid {
                            display: grid;
                            grid-template-columns: repeat(2, 1fr);
                            gap: 20px;
                        }
                        .print-summary-item {
                            text-align: center;
                        }
                        .print-summary-label {
                            font-size: 11px;
                            color: #64748b;
                            text-transform: uppercase;
                            letter-spacing: 0.5px;
                            margin-bottom: 6px;
                        }
                        .print-summary-value {
                            font-size: 20px;
                            font-weight: 700;
                            color: #0f172a;
                        }
                        .print-footer {
                            margin-top: 30px;
                            padding-top: 15px;
                            border-top: 2px solid #e2e8f0;
                            text-align: center;
                            font-size: 10px;
                            color: #94a3b8;
                        }
                    `}</style>
                    {transactionsToPrint.length > 0 ? (
                        <div className="print-container">
                            {/* Header */}
                            <div className="print-header">
                                <h1 className="print-title">Transactions Report</h1>
                                <p className="print-subtitle">
                                    Generated on: {dayjs().format('DD MMMM YYYY [at] hh:mm A')}
                                </p>
                                
                                {/* Info Grid */}
                                <div className="print-info-grid">
                                    {categoryFilter && (
                                        <div className="print-info-item">
                                            <span className="print-info-label">Category</span>
                                            <span className="print-info-value">{getCategoryLabel(categoryFilter as ExpenseCategory)}</span>
                                        </div>
                                    )}
                                    {dateRange !== 'all' && (
                                        <div className="print-info-item">
                                            <span className="print-info-label">Date Range</span>
                                            <span className="print-info-value">{dateRangeDisplay}</span>
                                        </div>
                                    )}
                                    <div className="print-info-item">
                                        <span className="print-info-label">Total Transactions</span>
                                        <span className="print-info-value">{totalTransactions}</span>
                                    </div>
                                    <div className="print-info-item">
                                        <span className="print-info-label">Report Period</span>
                                        <span className="print-info-value">
                                            {dateRange === 'all' ? 'All Time' : dateRangeDisplay}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Transactions Table */}
                            <table className="print-table">
                                <thead>
                                    <tr>
                                        <th style={{ width: '30%' }}>Transaction</th>
                                        <th style={{ width: '20%' }}>Category</th>
                                        <th style={{ width: '20%' }}>Date</th>
                                        <th className="text-right" style={{ width: '30%' }}>Amount</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactionsToPrint.map((txn) => (
                                        <tr key={txn._id}>
                                            <td>
                                                <div className="transaction-title">{txn.title}</div>
                                                <div style={{ fontSize: '9px', color: '#94a3b8', marginTop: '2px' }}>
                                                    {txn.description || 'No description'}
                                                </div>
                                            </td>
                                            <td>{getCategoryLabel(txn.category)}</td>
                                            <td>{dayjs(txn.date).format('DD MMM YYYY')}</td>
                                            <td className="text-right amount">৳{(txn.amount || 0).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                    <tr className="total-row">
                                        <td colSpan={3} className="text-right" style={{ fontSize: '12px', fontWeight: 700 }}>
                                            TOTAL:
                                        </td>
                                        <td className="text-right total-amount">
                                            ৳{totalAmount.toLocaleString()}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            {/* Summary Section */}
                            <div className="print-summary">
                                <div className="print-summary-title">Summary</div>
                                <div className="print-summary-grid">
                                    <div className="print-summary-item">
                                        <div className="print-summary-label">Total Transactions</div>
                                        <div className="print-summary-value">{totalTransactions}</div>
                                    </div>
                                    <div className="print-summary-item">
                                        <div className="print-summary-label">Total Amount</div>
                                        <div className="print-summary-value" style={{ color: '#16a34a' }}>
                                            ৳{totalAmount.toLocaleString()}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="print-footer">
                                <p>This is a computer-generated report. No signature is required.</p>
                                <p style={{ marginTop: '5px' }}>
                                    গাজী ট্রেডার্স Inventory Management System
                                </p>
                            </div>
                        </div>
                    ) : null}
                </div>
            </div>

            {/* Visible Content */}
            <div className="space-y-8">
            <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Finance</p>
                    <h1 className="mt-2 text-3xl font-bold text-slate-900">Transactions Center</h1>
                    <p className="text-sm text-slate-500">Unified ledger for purchases, refunds, and expenses.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 rounded-sm bg-brand px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                        <PlusIcon className="h-5 w-5" />
                        Add Transaction
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600 transition"
                    >
                        <PrinterIcon className="h-4 w-4" />
                        Print
                    </button>
                    <button
                        onClick={handleExportLedger}
                        className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                    >
                        <ArrowDownTrayIcon className="h-4 w-4" />
                        Export Ledger
                    </button>
                </div>
            </header>

            {/* Date Range Selector */}
            <DateRangeSelector
                dateRange={dateRange}
                customStartDate={customStartDate}
                customEndDate={customEndDate}
                onDateRangeChange={(range) => {
                    setDateRange(range);
                    if (range !== 'custom') {
                        setCustomStartDate('');
                        setCustomEndDate('');
                    }
                    setPage(1);
                }}
                onCustomStartDateChange={setCustomStartDate}
                onCustomEndDateChange={setCustomEndDate}
                onApplyCustomRange={() => {
                    if (customStartDate && customEndDate) {
                        setDateRange('custom');
                        setPage(1);
                    }
                }}
            />

            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                {/* Filters */}
                <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="relative max-w-xs">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search transactions..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                setPage(1); // Reset to first page when searching
                            }}
                            className="w-full rounded-sm border border-slate-200 pl-10 pr-4 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2">
                            <FunnelIcon className="h-4 w-4 text-slate-400" />
                            <select
                                value={categoryFilter}
                                onChange={(e) => {
                                    setCategoryFilter(e.target.value);
                                    setPage(1); // Reset to first page when filtering
                                }}
                                className="border-none bg-transparent text-sm font-medium text-slate-600 focus:ring-0 cursor-pointer"
                            >
                                <option value="">All Categories</option>
                                <option value="product_purchase">Purchase</option>
                                <option value="refund">Refund</option>
                                <option value="rent">Rent</option>
                                <option value="salaries">Salaries</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                        <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-2.5 pl-4 pr-4">S/N</th>
                                <th className="py-2.5 pl-4">Transaction</th>
                                <th className="py-2.5">Category</th>
                                <th className="py-2.5">Date</th>
                                <th className="py-2.5 text-right">Amount</th>
                                <th className="py-2.5 pr-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {transactions.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-slate-500">
                                        No transactions found.
                                    </td>
                                </tr>
                            ) : (
                                transactions.map((txn, idx) => (
                                    <tr key={txn._id} className="transition hover:bg-slate-50/60">
                                        <td className="py-2.5 pl-4 pr-4 text-slate-400">{(page - 1) * limit + idx + 1}</td>
                                        <td className="py-2.5 pl-4">
                                            <div className="flex items-center gap-2">
                                                <div className="rounded-sm bg-slate-50 p-1.5">
                                                    {getIcon(txn.category)}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900">{txn.title}</p>
                                                    <p className="text-[10px] text-slate-400">{txn.description || 'No description'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-2.5">
                                            {getCategoryBadge(txn.category)}
                                        </td>
                                        <td className="py-2.5">
                                            {dayjs(txn.date).format('DD MMM YYYY')}
                                        </td>
                                        <td className="py-2.5 text-right font-bold text-slate-900">
                                            ৳{txn.amount.toLocaleString()}
                                        </td>
                                        <td className="py-2.5 pr-4 text-center">
                                            {txn.category !== 'product_purchase' && (
                                                <button
                                                    onClick={() => setEditingTxn(txn)}
                                                    disabled={!canEditDelete}
                                                    className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-500 hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 transition-all disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-500"
                                                    title={canEditDelete ? 'Edit Transaction' : 'No permission'}
                                                >
                                                    <PencilSquareIcon className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {(() => {
                    const hasFilters = categoryFilter || dateRange !== 'all';
                    const total = hasFilters ? filteredTransactions.length : (data?.meta?.total ?? 0);
                    return total > 0 && (
                        <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-6">
                            <p className="text-sm text-slate-600">
                                Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
                                <span className="font-semibold text-slate-900">{Math.min(page * limit, total)}</span> of{' '}
                                <span className="font-semibold text-slate-900">{total}</span> entries
                                {hasFilters && (
                                    <span className="ml-2 text-xs text-slate-400">(filtered)</span>
                                )}
                            </p>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Previous
                                </button>
                                {getPageNumbers().map((pageNum, idx) =>
                                    pageNum === '...' ? (
                                        <span key={`ellipsis-${idx}`} className="flex h-9 w-9 items-center justify-center text-sm text-slate-400">...</span>
                                    ) : (
                                        <button
                                            key={pageNum}
                                            onClick={() => handlePageChange(pageNum as number)}
                                            className={`flex h-9 min-w-[36px] items-center justify-center rounded-sm px-3 text-sm font-semibold transition-all ${page === pageNum ? 'bg-brand text-white shadow-md shadow-brand/30' : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    )
                                )}
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className="rounded-sm border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                                >
                                    Next
                                </button>
                            </div>
                        </div>
                    );
                })()}
            </section>

            {/* Edit Transaction Modal */}
            {editingTxn && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-sm bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Edit Transaction</h2>
                            <button
                                onClick={() => setEditingTxn(null)}
                                className="rounded-sm p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                                <input
                                    name="title"
                                    required
                                    defaultValue={editingTxn.title}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                    placeholder="e.g. Office Rent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                                    <select
                                        name="category"
                                        required
                                        defaultValue={editingTxn.category}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                    >
                                        <option value="rent">Rent</option>
                                        <option value="utilities">Utilities</option>
                                        <option value="supplies">Supplies</option>
                                        <option value="salaries">Salaries</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                                        <input
                                            name="amount"
                                            type="number"
                                            required
                                            min="0"
                                            defaultValue={editingTxn.amount}
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                                <input
                                    name="date"
                                    type="date"
                                    required
                                    defaultValue={editingTxn.date ? editingTxn.date.split('T')[0] : ''}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description (Optional)</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    defaultValue={editingTxn.description || ''}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                                    placeholder="Add notes..."
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setEditingTxn(null)}
                                    className="flex-1 rounded-sm border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isUpdating}
                                    className="flex-1 rounded-sm bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition disabled:opacity-50"
                                >
                                    {isUpdating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Add Transaction Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
                    <div className="w-full max-w-lg rounded-sm bg-white p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-bold text-slate-900">Add New Transaction</h2>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="rounded-sm p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition"
                            >
                                <XMarkIcon className="h-6 w-6" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateExpense} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Title</label>
                                <input
                                    name="title"
                                    required
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                    placeholder="e.g. Office Rent"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Category</label>
                                    <select
                                        name="category"
                                        required
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                    >
                                        <option value="rent">Rent</option>
                                        <option value="utilities">Utilities</option>
                                        <option value="supplies">Supplies</option>
                                        <option value="salaries">Salaries</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Amount</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">৳</span>
                                        <input
                                            name="amount"
                                            type="number"
                                            required
                                            min="0"
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50 pl-8 pr-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Date</label>
                                <input
                                    name="date"
                                    type="date"
                                    required
                                    defaultValue={new Date().toISOString().split('T')[0]}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Description (Optional)</label>
                                <textarea
                                    name="description"
                                    rows={3}
                                    className="w-full rounded-sm border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none"
                                    placeholder="Add notes..."
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 rounded-sm border border-slate-200 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isCreating}
                                    className="flex-1 rounded-sm bg-brand py-3 text-sm font-semibold text-white shadow-lg shadow-brand/30 hover:shadow-xl hover:shadow-brand/40 transition disabled:opacity-50"
                                >
                                    {isCreating ? 'Adding...' : 'Add Transaction'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            </div>
        </>
    );
};

export default TransactionsPage;
