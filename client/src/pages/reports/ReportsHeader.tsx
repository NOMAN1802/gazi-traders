import {
    ArrowPathIcon,
    PrinterIcon,
    DocumentArrowDownIcon,
} from '@heroicons/react/24/outline';

interface ReportsHeaderProps {
    onRefresh: () => void;
    onGeneratePDF: () => void;
    onPrint: () => void;
}

const ReportsHeader = ({ onRefresh, onGeneratePDF, onPrint }: ReportsHeaderProps) => {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Analytics</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Reports & Analytics</h1>
                <p className="text-sm text-slate-500">Comprehensive inventory, financial, and operational insights.</p>
            </div>
            <div className="flex gap-3 no-print">
                <button
                    onClick={onRefresh}
                    className="flex items-center gap-2 rounded-sm border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                    <ArrowPathIcon className="h-4 w-4" />
                    Refresh
                </button>
                <button
                    onClick={onGeneratePDF}
                    className="flex items-center gap-2 rounded-sm bg-brand px-5 py-2 text-sm font-semibold text-white shadow-brand/30 hover:bg-brand/90 transition"
                >
                    <DocumentArrowDownIcon className="h-4 w-4" />
                    Generate PDF
                </button>
                <button
                    onClick={onPrint}
                    className="flex items-center gap-2 rounded-sm border border-slate-200 bg-white px-5 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                    <PrinterIcon className="h-4 w-4" />
                    Print Report
                </button>
            </div>
        </div>
    );
};

export default ReportsHeader;

