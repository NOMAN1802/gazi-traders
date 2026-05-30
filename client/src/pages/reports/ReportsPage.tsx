import { useState, useMemo, useRef } from 'react';
import dayjs from 'dayjs';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useReactToPrint } from 'react-to-print';
import Loader from '@/components/common/Loader';
import ErrorState from '@/components/common/ErrorState';
import gaziLogo from '@/assets/gaziLogo.svg';
import {
    useGetFinancialSummaryQuery,
    useGetStockReportQuery,
    useGetOrderReportQuery,
    useGetRevenueReportQuery,
    useGetExpenseReportQuery,
} from '@/services/reportsApi';
import { useGetOrdersQuery, type Order } from '@/services/ordersApi';
import ReportsHeader from './ReportsHeader';
import DateRangeSelector from './DateRangeSelector';
import FinancialOverviewCards from './FinancialOverviewCards';
import SalesAnalytics from './SalesAnalytics';
import InvoiceAnalytics from './InvoiceAnalytics';
import SupplierStatisticsSection from './SupplierStatisticsSection';

type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';


const ReportsPage = () => {
    const [dateRange, setDateRange] = useState<DateRangeType>('all');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const reportRef = useRef<HTMLDivElement>(null);

    // Calculate date range based on selection
    const getDateRangeParams = useMemo(() => {
        if (dateRange === 'all') {
            return undefined; // No date filtering for 'all'
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

    const { data: financialData, isLoading: loadingFinancial, refetch: refetchFinancial } = useGetFinancialSummaryQuery(getDateRangeParams);
    const { data: stockData, isLoading: loadingStock, refetch: refetchStock } = useGetStockReportQuery();
    const { data: orderData, isLoading: loadingOrders, refetch: refetchOrders } = useGetOrderReportQuery(getDateRangeParams);
    const { isLoading: loadingRevenue, refetch: refetchRevenue } = useGetRevenueReportQuery(getDateRangeParams);
    const { data: expenseReportData, isLoading: loadingExpenses, refetch: refetchExpenses } = useGetExpenseReportQuery(getDateRangeParams);
    
    const { data: ordersData } = useGetOrdersQuery({ limit: 10000 });

    const isLoading = loadingFinancial || loadingStock || loadingOrders || loadingRevenue || loadingExpenses;

    const refetchAll = () => {
        refetchFinancial();
        refetchStock();
        refetchOrders();
        refetchRevenue();
        refetchExpenses();
    };

    // Orders filtered by selected date range (client-side)
    const filteredOrders = useMemo(() => {
        if (!ordersData?.result) return [];
        if (!getDateRangeParams) return ordersData.result;
        const { startDate, endDate } = getDateRangeParams;
        return ordersData.result.filter((order: Order) => {
            const d = dayjs(order.createdAt);
            return d.isAfter(dayjs(startDate).subtract(1, 'ms')) &&
                   d.isBefore(dayjs(endDate).add(1, 'ms'));
        });
    }, [ordersData, getDateRangeParams]);

    // Actual paid and pending totals from filtered orders
    const paidAndPending = useMemo(() => {
        let totalPaid = 0;
        let totalPending = 0;
        filteredOrders.forEach((order: Order) => {
            const paid = order.status === 'completed'
                ? (order.totalAmount || 0)
                : ((order as { paidAmount?: number }).paidAmount || 0);
            totalPaid += paid;
            totalPending += (order.totalAmount || 0) - paid;
        });
        return { totalPaid, totalPending };
    }, [filteredOrders]);

    // Monthly sales data — real received vs pending per month (always all orders for chart)
    const monthlySalesData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthMap = new Map<number, { received: number; pending: number }>();

        (ordersData?.result || []).forEach((order: Order) => {
            const month = dayjs(order.createdAt).month() + 1;
            const existing = monthMap.get(month) || { received: 0, pending: 0 };
            const paid = order.status === 'completed'
                ? (order.totalAmount || 0)
                : ((order as { paidAmount?: number }).paidAmount || 0);
            existing.received += paid;
            existing.pending += (order.totalAmount || 0) - paid;
            monthMap.set(month, existing);
        });

        return months.map((month, index) => ({
            month,
            received: monthMap.get(index + 1)?.received || 0,
            pending: monthMap.get(index + 1)?.pending || 0,
        }));
    }, [ordersData]);

    // Sales summary with real data
    const salesSummary = useMemo(() => {
        const totalSales = financialData?.revenue || 0;
        const receipts = paidAndPending.totalPaid;
        const expenses = financialData?.expenses || 0;
        const earnings = receipts - expenses;
        return { totalSales, receipts, expenses, earnings };
    }, [financialData, paidAndPending]);

    // Invoice analytics — real invoiced / received / pending
    const invoiceAnalyticsData = useMemo(() => {
        const invoiced = filteredOrders.reduce((sum: number, o: Order) => sum + (o.totalAmount || 0), 0);
        const received = paidAndPending.totalPaid;
        const pending = paidAndPending.totalPending;
        return { invoiced, received, pending };
    }, [filteredOrders, paidAndPending]);

    // Invoice chart data for donut chart
    const invoiceChartData = useMemo(() => {
        const { invoiced, received, pending } = invoiceAnalyticsData;
        return [
            { name: 'Invoiced', value: invoiced, color: '#5C6CFF' },
            { name: 'Received', value: received, color: '#10B981' },
            { name: 'Pending', value: pending, color: '#F59E0B' },
        ];
    }, [invoiceAnalyticsData]);






    // Calculate availability percentage

    // Print Handler - Must be called before any early returns
    const handlePrint = useReactToPrint({
        contentRef: reportRef,
        documentTitle: `Reports_${dayjs().format('YYYY-MM-DD')}`,
    });

    // PDF Generation Handler
    const handleGeneratePDF = async () => {
        if (!reportRef.current) return;

        try {
            // Show the report content temporarily
            const originalDisplay = reportRef.current.style.display;
            reportRef.current.style.display = 'block';
            reportRef.current.style.position = 'absolute';
            reportRef.current.style.left = '-9999px';
            reportRef.current.style.width = '800px';

            // Wait for rendering
            await new Promise(resolve => setTimeout(resolve, 200));

            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                width: 800,
                onclone: (clonedDoc) => {
                    // Remove all stylesheets from the cloned document to prevent oklch parsing
                    const styleSheets = clonedDoc.querySelectorAll('style, link[rel="stylesheet"]');
                    styleSheets.forEach((sheet) => {
                        sheet.remove();
                    });

                    // Also remove any inline styles with oklch
                    const allElements = clonedDoc.querySelectorAll('*');
                    allElements.forEach((el) => {
                        const htmlEl = el as HTMLElement;
                        const style = htmlEl.getAttribute('style');
                        if (style && style.includes('oklch')) {
                            // Remove oklch values
                            htmlEl.setAttribute('style', style.replace(/[^:;]*oklch\([^)]+\)[^;]*/g, ''));
                        }
                    });
                },
            });

            // Restore original display
            reportRef.current.style.display = originalDisplay;
            reportRef.current.style.position = '';
            reportRef.current.style.left = '';
            reportRef.current.style.width = '';

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 10;

            pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);

            const fileName = `report_${dayjs().format('YYYY-MM-DD_HH-mm-ss')}.pdf`;
            pdf.save(fileName);
        } catch (error) {
            console.error('Error generating PDF:', error);
            // Restore original display on error
            if (reportRef.current) {
                reportRef.current.style.display = 'none';
                reportRef.current.style.position = '';
                reportRef.current.style.left = '';
                reportRef.current.style.width = '';
            }
            alert('Failed to generate PDF. Please try using the Print option instead, or contact support if the issue persists.');
        }
    };

    // Calculate Due Amount from orders - Must be called before any early returns
    const dueAmount = useMemo(() => {
        if (!orderData?.orders) return 0;
        const totalAmount = orderData.orders.reduce((sum: number, order) => sum + (order.totalAmount || 0), 0);
        const paidAmount = orderData.orders.reduce((sum: number, order) => {
            if (order.status === 'completed') {
                return sum + (order.totalAmount || 0);
            }
            // For partial orders, use paidAmount if available, otherwise 0
            return sum + ((order as { paidAmount?: number }).paidAmount || 0);
        }, 0);
        return totalAmount - paidAmount;
    }, [orderData]);

    // Report content for PDF/Print - memoized to avoid recreating on every render
    // Must be called before early returns per React hooks rules
    const reportContent = useMemo(() => {
        // Early return if data not ready - this will be checked again in render
        if (!financialData || !stockData) return null;

        const dateRangeLabel = dateRange === 'all' 
            ? 'All Time'
            : dateRange === 'custom' && customStartDate && customEndDate
            ? `${dayjs(customStartDate).format('DD MMM YYYY')} - ${dayjs(customEndDate).format('DD MMM YYYY')}`
            : dateRange.charAt(0).toUpperCase() + dateRange.slice(1);

        const reportProfit = (financialData.revenue || 0) - (financialData.expenses || 0);

        return (
            <div style={{ fontFamily: 'Arial, sans-serif', padding: '20mm', width: '210mm', margin: '0 auto', color: '#000', backgroundColor: '#ffffff' }}>
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
                    .print-section-title {
                        font-size: 20px;
                        font-weight: 700;
                        color: #0f172a;
                        margin-bottom: 15px;
                        padding-bottom: 10px;
                        border-bottom: 2px solid #cbd5e1;
                    }
                    .print-table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-bottom: 20px;
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
                    }
                    .print-table tbody tr:nth-child(even) {
                        background-color: #f8fafc;
                    }
                    .print-table td {
                        padding: 10px 8px;
                        color: #334155;
                        border: 1px solid #e2e8f0;
                    }
                    .print-table td.text-right {
                        text-align: right;
                        font-weight: 600;
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
                {/* Header */}
                <div className="print-header" style={{ textAlign: 'center' }}>
                    <div style={{
                        display: 'inline-block',
                        backgroundColor: '#ffffff',
                        padding: '10px',
                        borderRadius: '4px',
                        marginBottom: '10px'
                    }}>
                        <img
                            src={gaziLogo}
                            alt="Gazi Traders Logo"
                            style={{
                                maxWidth: '150px',
                                height: 'auto',
                                display: 'block',
                                backgroundColor: '#ffffff'
                            }}
                        />
                    </div>
                    <h1 className="print-title">Financial Report</h1>
                    <p className="print-subtitle">{dateRangeLabel} Report</p>
                    <p className="print-subtitle">Generated on: {dayjs().format('DD MMMM YYYY [at] hh:mm A')}</p>
                    
                    {/* Info Grid */}
                    <div className="print-info-grid">
                        <div className="print-info-item">
                            <span className="print-info-label">Report Period</span>
                            <span className="print-info-value">{dateRangeLabel}</span>
                        </div>
                        <div className="print-info-item">
                            <span className="print-info-label">Total Sales</span>
                            <span className="print-info-value">৳{financialData.revenue.toLocaleString() || '0'}</span>
                        </div>
                        <div className="print-info-item">
                            <span className="print-info-label">Total Expenses</span>
                            <span className="print-info-value">৳{financialData.expenses.toLocaleString() || '0'}</span>
                        </div>
                        <div className="print-info-item">
                            <span className="print-info-label">Total Products</span>
                            <span className="print-info-value">{stockData.summary.totalProducts || 0}</span>
                        </div>
                    </div>
                </div>

                {/* Financial Overview */}
                <div style={{ marginBottom: '30px' }}>
                    <h2 className="print-section-title">Financial Overview</h2>
                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>Financial Item</th>
                                <th className="text-right">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Total Sales</td>
                                <td className="text-right">৳{financialData.revenue.toLocaleString() || '0'}</td>
                            </tr>
                            <tr>
                                <td>Total Expenses</td>
                                <td className="text-right">৳{financialData.expenses.toLocaleString() || '0'}</td>
                            </tr>
                            <tr>
                                <td>Profit</td>
                                <td className="text-right" style={{ color: reportProfit >= 0 ? '#10b981' : '#ef4444', fontWeight: '700' }}>
                                    ৳{reportProfit.toLocaleString() || '0'}
                                </td>
                            </tr>
                            <tr>
                                <td>Due Amount</td>
                                <td className="text-right">৳{dueAmount.toLocaleString() || '0'}</td>
                            </tr>
                            <tr>
                                <td>Total Sales Count</td>
                                <td className="text-right">{orderData?.summary.totalOrders || 0}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Stock Overview */}
                <div style={{ marginBottom: '30px' }}>
                    <h2 className="print-section-title">Stock Overview</h2>
                    <table className="print-table">
                        <thead>
                            <tr>
                                <th>Stock Item</th>
                                <th className="text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Total Products</td>
                                <td className="text-right">{stockData.summary.totalProducts || 0}</td>
                            </tr>
                            <tr>
                                <td>In Stock</td>
                                <td className="text-right">
                                    {(stockData.summary.totalProducts || 0) - (stockData.summary.outOfStockItems || 0) - (stockData.summary.lowStockItems || 0)}
                                </td>
                            </tr>
                            <tr>
                                <td>Low Stock Items</td>
                                <td className="text-right">{stockData.summary.lowStockItems || 0}</td>
                            </tr>
                            <tr>
                                <td>Out of Stock</td>
                                <td className="text-right">{stockData.summary.outOfStockItems || 0}</td>
                            </tr>
                            <tr>
                                <td>Total Stock Value</td>
                                <td className="text-right">
                                    ৳{stockData.summary.totalStockValue ? stockData.summary.totalStockValue.toLocaleString() : '0'}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className="print-footer">
                    <p>This is a computer-generated report. No signature is required.</p>
                    <p style={{ marginTop: '5px' }}>
                        গাজী ট্রেডার্স Inventory Management System | Powered by Bytespate Limited
                    </p>
                </div>
            </div>
        );
    }, [dateRange, customStartDate, customEndDate, financialData, dueAmount, orderData, stockData]);

    // Calculate financial metrics
    const totalSales = financialData?.revenue || 0;
    const totalExpenses = financialData?.expenses || 0;
    
    // Profit = Total Sales Revenue − Total Expenses (no purchase price tracking)
    const profit = totalSales - totalExpenses;

    // Early returns must come after all hooks
    if (isLoading) return <Loader fullScreen message="Compiling reports..." />;

    if (!financialData || !stockData) {
        return <ErrorState description="Unable to load reports" onRetry={refetchAll} />;
    }

    // Financial Overview Cards
    const financialOverviewCards = [
        {
            label: 'Total Sales',
            value: `৳${totalSales.toLocaleString()}`,
            delta: '',
            deltaLabel: '',
            color: 'green' as const,
            icon: '💰',
        },
        {
            label: 'Operating Expenses',
            value: `৳${totalExpenses.toLocaleString()}`,
            delta: '',
            deltaLabel: '',
            color: 'orange' as const,
            icon: '💸',
        },
        {
            label: 'Profit',
            value: `৳${profit.toLocaleString()}`,
            delta: '',
            deltaLabel: '',
            color: profit >= 0 ? ('green' as const) : ('red' as const),
            icon: '📈',
        },
    ];


    return (
        <div className="space-y-8">
            {/* Hidden report content for PDF/Print */}
            <div ref={reportRef} style={{ display: 'none' }}>
                {reportContent}
            </div>

            {/* Visible page content */}
            <div className="space-y-8">
                <ReportsHeader
                    onRefresh={refetchAll}
                    onGeneratePDF={handleGeneratePDF}
                    onPrint={handlePrint}
                />

                {/* Reports & Analytics Content */}
                <div className="space-y-8">
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
                            setTimeout(() => refetchAll(), 100);
                        }}
                        onCustomStartDateChange={setCustomStartDate}
                        onCustomEndDateChange={setCustomEndDate}
                        onApplyCustomRange={() => {
                            if (customStartDate && customEndDate) {
                                setDateRange('custom');
                                refetchAll();
                            }
                        }}
                    />

                    <FinancialOverviewCards cards={financialOverviewCards} />

                    {/* Analytics Section */}
                    <div className="grid gap-6 xl:grid-cols-2">
                        <SalesAnalytics
                            monthlySalesData={monthlySalesData}
                            salesSummary={salesSummary}
                        />
                        <InvoiceAnalytics
                            invoiceChartData={invoiceChartData}
                            invoiceAnalyticsData={invoiceAnalyticsData}
                        />
                    </div>

                    <SupplierStatisticsSection
                        expenseData={expenseReportData}
                        dateRange={getDateRangeParams}
                    />
                </div>

                {/* Print Styles */}
                <style>{`
                @media print {
                    body {
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    @page {
                        size: A4;
                        margin: 20mm;
                    }
                    .no-print {
                        display: none !important;
                    }
                    div[style*="display: none"] {
                        display: block !important;
                    }
                }
            `}</style>
            </div>
        </div>
    );
};

export default ReportsPage;
