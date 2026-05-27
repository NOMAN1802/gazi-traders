import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ShoppingCartIcon,
    MagnifyingGlassIcon,
    FunnelIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    EyeIcon,
    PrinterIcon,
    ChevronDownIcon,
    PencilSquareIcon,
} from '@heroicons/react/24/outline';
import dayjs from 'dayjs';
import { useReactToPrint } from 'react-to-print';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import { useGetPurchasesQuery } from '@/services/purchasesApi';
import { useGetSuppliersQuery } from '@/services/suppliersApi';
import PurchaseDetailsModal from './PurchaseDetailsModal';
import DateRangeSelector from '@/pages/reports/DateRangeSelector';
import { usePermissions } from '@/hooks/usePermissions';

type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

const PurchaseListPage = () => {
    const { canEditDelete } = usePermissions();
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [viewingPurchaseId, setViewingPurchaseId] = useState<string | null>(null);
    const [dateRange, setDateRange] = useState<DateRangeType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const filterRef = useRef<HTMLDivElement>(null);
    const printRef = useRef<HTMLDivElement>(null);

    const limit = 20;

    // Calculate date range based on selection
    const getDateRangeParams = useMemo(() => {
        // Return null for 'all' to indicate no date filtering
        if (dateRange === 'all') {
            return null;
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

    // Fetch purchases
    // Fetch all purchases when filtering by supplier or date range (client-side filtering needed)
    const shouldFetchAll = selectedSupplier || (dateRange !== 'all');

    const queryParams = useMemo(() => {
        if (shouldFetchAll) {
            // When filtering, fetch all purchases for client-side filtering
            return { limit: 10000, search: search || undefined };
        }
        // When no filters, use pagination
        return { page, limit, search: search || undefined };
    }, [shouldFetchAll, page, limit, search]);

    const {
        data: purchasesData,
        isLoading: isPurchasesLoading,
        isError: isPurchasesError,
        refetch,
    } = useGetPurchasesQuery(queryParams);

    const purchases = useMemo(() => purchasesData?.result || [], [purchasesData?.result]);
    const totalPurchases = purchasesData?.meta?.total || 0;

    // Fetch suppliers for filter dropdown
    const { data: suppliersData } = useGetSuppliersQuery({ limit: 100 });

    // Filter purchases by date range and supplier
    const filteredPurchases = useMemo(() => {
        let filtered = purchases;

        // Filter by date range (only if not 'all')
        if (dateRange !== 'all' && getDateRangeParams) {
            const { startDate, endDate } = getDateRangeParams;
            filtered = filtered.filter((purchase) => {
                if (!purchase.createdAt) return false;
                const purchaseDate = dayjs(purchase.createdAt);
                const start = dayjs(startDate).startOf('day');
                const end = dayjs(endDate).endOf('day');
                return (purchaseDate.isAfter(start.subtract(1, 'millisecond')) || purchaseDate.isSame(start, 'day')) &&
                    (purchaseDate.isBefore(end.add(1, 'millisecond')) || purchaseDate.isSame(end, 'day'));
            });
        }

        // Filter by supplier
        if (selectedSupplier) {
            filtered = filtered.filter((purchase) => {
                if (!purchase.supplier) return false;

                // Purchase supplier is an object
                const supplierId = typeof purchase.supplier === 'object' && purchase.supplier !== null
                    ? purchase.supplier._id || ''
                    : '';

                return supplierId && String(supplierId) === String(selectedSupplier);
            });
        }

        return filtered;
    }, [purchases, selectedSupplier, dateRange, getDateRangeParams]);

    // Calculate total pages based on whether filtering is active
    const totalPages = useMemo(() => {
        const hasFilters = selectedSupplier || dateRange !== 'all';
        if (hasFilters) {
            return Math.ceil(filteredPurchases.length / limit);
        }
        return Math.ceil(totalPurchases / limit);
    }, [selectedSupplier, dateRange, filteredPurchases.length, totalPurchases, limit]);

    const handlePageChange = (newPage: number) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
        }
    };

    // Paginate purchases for display
    const paginatedPurchases = useMemo(() => {
        const hasFilters = selectedSupplier || dateRange !== 'all';
        if (!hasFilters) {
            // If no filter, use the purchases from API (already paginated by backend)
            return purchases;
        }
        // If filtered, paginate the filtered results client-side
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + limit;
        return filteredPurchases.slice(startIndex, endIndex);
    }, [purchases, filteredPurchases, selectedSupplier, dateRange, page, limit]);

    const handleSupplierFilter = (supplierId: string | null) => {
        setSelectedSupplier(supplierId);
        setIsFilterOpen(false);
        setPage(1);
    };

    const handleClearFilter = () => {
        setSelectedSupplier(null);
        setIsFilterOpen(false);
        setPage(1);
    };

    const handleViewPurchase = (purchaseId: string) => {
        setViewingPurchaseId(purchaseId);
    };

    const handleCloseDetailsModal = () => {
        setViewingPurchaseId(null);
    };

    const handleEditPurchase = (purchaseId: string) => {
        navigate(`/purchases/${purchaseId}/edit`);
    };

    const handlePrint = useReactToPrint({
        contentRef: printRef,
        documentTitle: `Purchase-List-${dayjs().format('YYYY-MM-DD')}`,
    });

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
                setIsFilterOpen(false);
            }
        };

        if (isFilterOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isFilterOpen]);

    // Calculate totals - use filtered purchases for accurate totals when filtering
    const totalAmount = useMemo(() => {
        const hasFilters = selectedSupplier || dateRange !== 'all';
        const purchasesToSum = hasFilters ? filteredPurchases : purchases;
        return purchasesToSum.reduce((sum, purchase) => sum + (purchase.totalAmount || 0), 0);
    }, [filteredPurchases, purchases, selectedSupplier, dateRange]);

    if (isPurchasesLoading) {
        return <Loader fullScreen message="Loading purchases..." />;
    }

    if (isPurchasesError) {
        return <ErrorState description="Unable to fetch purchases." onRetry={refetch} />;
    }

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
                        .print-table th.text-center {
                            text-align: center;
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
                        .print-table td.text-center {
                            text-align: center;
                        }
                        .print-table td.text-right {
                            text-align: right;
                        }
                        .print-table .purchase-title {
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
                    {(() => {
                        const hasFilters = selectedSupplier || dateRange !== 'all';
                        const purchasesToPrint = hasFilters ? filteredPurchases : purchases;
                        const totalPurchases = purchasesToPrint.length;
                        const totalAmount = purchasesToPrint.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
                        const selectedSupplierName = selectedSupplier && suppliersData?.suppliers
                            ? suppliersData.suppliers.find((s) => s._id === selectedSupplier)?.name
                            : null;
                        const dateRangeDisplay = dateRange === 'custom' && customStartDate && customEndDate
                            ? `${dayjs(customStartDate).format('DD MMM YYYY')} - ${dayjs(customEndDate).format('DD MMM YYYY')}`
                            : dateRange.charAt(0).toUpperCase() + dateRange.slice(1);

                        return purchasesToPrint.length > 0 ? (
                            <div className="print-container">
                                {/* Header */}
                                <div className="print-header">
                                    <h1 className="print-title">Purchase List Report</h1>
                                    <p className="print-subtitle">
                                        Generated on: {dayjs().format('DD MMMM YYYY [at] hh:mm A')}
                                    </p>

                                    {/* Info Grid */}
                                    <div className="print-info-grid">
                                        {selectedSupplierName && (
                                            <div className="print-info-item">
                                                <span className="print-info-label">Supplier</span>
                                                <span className="print-info-value">{selectedSupplierName}</span>
                                            </div>
                                        )}
                                        {dateRange !== 'all' && (
                                            <div className="print-info-item">
                                                <span className="print-info-label">Date Range</span>
                                                <span className="print-info-value">{dateRangeDisplay}</span>
                                            </div>
                                        )}
                                        <div className="print-info-item">
                                            <span className="print-info-label">Total Purchases</span>
                                            <span className="print-info-value">{totalPurchases}</span>
                                        </div>
                                        <div className="print-info-item">
                                            <span className="print-info-label">Report Period</span>
                                            <span className="print-info-value">{dateRangeDisplay}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Purchases Table */}
                                <table className="print-table">
                                    <thead>
                                        <tr>
                                            <th style={{ width: '12%' }}>Date</th>
                                            <th style={{ width: '20%' }}>Title</th>
                                            <th style={{ width: '18%' }}>Supplier</th>
                                            <th className="text-right" style={{ width: '15%' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {purchasesToPrint.map((purchase) => {
                                            const supplier = typeof purchase.supplier === 'object'
                                                ? purchase.supplier
                                                : null;
                                            return (
                                                <tr key={purchase._id}>
                                                    <td>{purchase.createdAt ? dayjs(purchase.createdAt).format('DD MMM YYYY') : 'N/A'}</td>
                                                    <td className="purchase-title">{purchase.purchaseNumber}</td>
                                                    <td>{supplier?.name || 'N/A'}</td>
                                                    <td className="text-right amount">৳{(purchase.totalAmount || 0).toLocaleString()}</td>
                                                </tr>
                                            );
                                        })}
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
                                            <div className="print-summary-label">Total Purchases</div>
                                            <div className="print-summary-value">{totalPurchases}</div>
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
                        ) : null;
                    })()}
                </div>
            </div>

            {/* Visible Content */}
            <div className="space-y-8">
                {/* Header */}
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Purchase Management</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">Purchase List</h1>
                    </div>
                </div>

                {/* Date Range Selector */}
                <DateRangeSelector
                    dateRange={dateRange}
                    customStartDate={customStartDate}
                    customEndDate={customEndDate}
                    onDateRangeChange={(range) => {
                        setDateRange(range);
                        setCustomStartDate('');
                        setCustomEndDate('');
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

                {/* Stats Cards */}
                <section className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {[
                        {
                            label: 'Total Purchases',
                            value: totalPurchases,
                            color: 'blue',
                            icon: '📦',
                            subtitle: 'All time',
                        },
                        {
                            label: 'Total Amount',
                            value: `৳${totalAmount.toLocaleString()}`,
                            color: 'green',
                            icon: '💵',
                            subtitle: 'Total value',
                        },
                        {
                            label: 'Filtered Results',
                            value: filteredPurchases.length,
                            color: 'purple',
                            icon: '📋',
                            subtitle: 'Current view',
                        },
                    ].map((card) => (
                        <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-lg">{card.icon}</span>
                                        <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                    </div>
                                    <p className={`text-2xl font-bold ${card.color === 'blue' ? 'text-blue-600' : card.color === 'green' ? 'text-green-600' : 'text-purple-600'} group-hover:scale-105 transition-transform duration-300`}>
                                        {card.value}
                                    </p>
                                    <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{card.subtitle}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </section>

                {/* Purchases Table */}
                <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex flex-1 items-center gap-2 rounded-sm border border-slate-200 bg-white px-3 py-2">
                            <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
                            <input
                                className="w-full border-none bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
                                placeholder="Search purchases..."
                                value={search}
                                onChange={(e) => {
                                    setSearch(e.target.value);
                                    setPage(1);
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handlePrint}
                                className="inline-flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition-all hover:bg-orange-50 hover:border-orange-300 hover:text-orange-600"
                            >
                                <PrinterIcon className="h-5 w-5" />
                                Print
                            </button>
                            <div className="relative" ref={filterRef}>
                                <button
                                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                                    className={`inline-flex items-center gap-2 rounded-sm border px-4 py-2 text-sm font-semibold transition-all ${selectedSupplier
                                        ? 'border-brand bg-brand/10 text-brand'
                                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                                        }`}
                                >
                                    <FunnelIcon className="h-5 w-5" />
                                    Filter
                                    {selectedSupplier && suppliersData?.suppliers && (
                                        <span className="ml-1 rounded-sm bg-brand px-2 py-0.5 text-xs text-white">
                                            {suppliersData.suppliers.find((s) => s._id === selectedSupplier)?.name || 'Supplier'}
                                        </span>
                                    )}
                                    <ChevronDownIcon className={`h-4 w-4 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Filter Dropdown */}
                                {isFilterOpen && (
                                    <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-sm border border-slate-200 bg-white shadow-xl">
                                        <div className="p-3 border-b border-slate-100">
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-sm font-semibold text-slate-900">Filter by Factory</h3>
                                                {selectedSupplier && (
                                                    <button
                                                        onClick={handleClearFilter}
                                                        className="text-xs font-semibold text-brand hover:text-brand/80 transition-colors"
                                                    >
                                                        Clear
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                        <div className="max-h-64 overflow-y-auto p-2">
                                            <button
                                                onClick={() => handleSupplierFilter(null)}
                                                className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-all ${!selectedSupplier
                                                    ? 'bg-brand/10 text-brand font-semibold'
                                                    : 'text-slate-700 hover:bg-slate-50'
                                                    }`}
                                            >
                                                All Factories
                                            </button>
                                            {suppliersData?.suppliers && suppliersData.suppliers.length > 0 ? (
                                                suppliersData.suppliers.map((supplier) => (
                                                    <button
                                                        key={supplier._id}
                                                        onClick={() => handleSupplierFilter(supplier._id)}
                                                        className={`w-full text-left px-3 py-2 rounded-sm text-sm transition-all ${selectedSupplier === supplier._id
                                                            ? 'bg-brand/10 text-brand font-semibold'
                                                            : 'text-slate-700 hover:bg-slate-50'
                                                            }`}
                                                    >
                                                        {supplier.name}
                                                    </button>
                                                ))
                                            ) : (
                                                <div className="px-3 py-2 text-sm text-slate-500">No suppliers found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mt-6 overflow-x-auto">
                        <table className="min-w-full divide-y divide-slate-100 text-left text-xs">
                            <thead className="text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="py-2.5 pr-4">S/N</th>
                                    <th className="py-2.5 pr-4">Date</th>
                                    <th className="py-2.5 pr-4">Title</th>
                                    <th className="py-2.5 pr-4">Supplier</th>
                                    <th className="py-2.5 pr-4">Purchase On</th>
                                    <th className="py-2.5 pr-4">Amount</th>
                                    <th className="py-2.5">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-600">
                                {paginatedPurchases.map((purchase, idx) => {
                                    // Purchase supplier is always an object according to the type
                                    const supplier = purchase.supplier;

                                    return (
                                        <tr key={purchase._id} className="transition hover:bg-slate-50/70">
                                            <td className="py-2.5 pr-4 text-slate-400">{(page - 1) * limit + idx + 1}</td>
                                            <td className="py-2.5 pr-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-blue-100">
                                                        <ShoppingCartIcon className="h-4 w-4 text-blue-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-semibold text-slate-900">
                                                            {purchase.createdAt ? dayjs(purchase.createdAt).format('DD MMM YYYY') : 'N/A'}
                                                        </p>
                                                        <p className="text-[10px] text-slate-400">
                                                            {purchase.createdAt ? dayjs(purchase.createdAt).format('hh:mm A') : ''}
                                                        </p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="py-2.5 pr-4 font-semibold text-slate-900">{purchase.purchaseNumber}</td>
                                            <td className="py-2.5 pr-4 text-slate-700">{supplier?.name || 'N/A'}</td>
                                            <td className="py-2.5 pr-4 text-slate-500">
                                                {purchase.createdAt ? dayjs(purchase.createdAt).format('DD MMM YYYY') : 'N/A'}
                                            </td>
                                            <td className="py-2.5 pr-4 font-semibold text-slate-900">৳{(purchase.totalAmount || 0).toLocaleString()}</td>
                                            <td className="py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleViewPurchase(purchase._id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600"
                                                        title="View Purchase"
                                                    >
                                                        <EyeIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleViewPurchase(purchase._id)}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-purple-50 hover:border-purple-300 hover:text-purple-600"
                                                        title="Print Purchase"
                                                    >
                                                        <PrinterIcon className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditPurchase(purchase._id)}
                                                        disabled={!canEditDelete}
                                                        className="inline-flex h-8 w-8 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-amber-50 hover:border-amber-300 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:border-slate-200 disabled:hover:text-slate-600"
                                                        title={canEditDelete ? 'Edit Purchase' : 'No permission'}
                                                    >
                                                        <PencilSquareIcon className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        {paginatedPurchases.length === 0 && (
                            <div className="py-10 text-center text-sm text-slate-500">
                                {selectedSupplier ? 'No purchases found for the selected supplier.' : 'No purchases found.'}
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {paginatedPurchases.length > 0 && (
                        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-slate-100 pt-6 sm:flex-row">
                            <div className="text-sm text-slate-500">
                                Showing <span className="font-semibold text-slate-900">{(page - 1) * limit + 1}</span> to{' '}
                                <span className="font-semibold text-slate-900">
                                    {selectedSupplier
                                        ? Math.min(page * limit, filteredPurchases.length)
                                        : Math.min(page * limit, totalPurchases)
                                    }
                                </span>{' '}
                                of <span className="font-semibold text-slate-900">
                                    {selectedSupplier ? filteredPurchases.length : totalPurchases}
                                </span> purchases
                                {selectedSupplier && (
                                    <span className="ml-2 text-xs text-slate-400">
                                        (filtered by supplier)
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                </button>
                                <span className="text-sm font-semibold text-slate-700">
                                    Page {page} of {totalPages || 1}
                                </span>
                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page >= totalPages}
                                    className="flex h-9 w-9 items-center justify-center rounded-sm border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                                >
                                    <ChevronRightIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    )}
                </section>

                {/* Purchase Details Modal */}
                <PurchaseDetailsModal
                    purchaseId={viewingPurchaseId}
                    onClose={handleCloseDetailsModal}
                />
            </div>

        </>
    );
};

export default PurchaseListPage;


