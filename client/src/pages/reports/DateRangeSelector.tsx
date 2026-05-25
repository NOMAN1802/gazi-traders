import {
    CalendarIcon,
    CalendarDaysIcon,
    ClockIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/outline';

type DateRangeType = 'all' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface DateRangeSelectorProps {
    dateRange: DateRangeType;
    customStartDate: string;
    customEndDate: string;
    onDateRangeChange: (range: DateRangeType) => void;
    onCustomStartDateChange: (date: string) => void;
    onCustomEndDateChange: (date: string) => void;
    onApplyCustomRange: () => void;
}

const DateRangeSelector = ({
    dateRange,
    customStartDate,
    customEndDate,
    onDateRangeChange,
    onCustomStartDateChange,
    onCustomEndDateChange,
    onApplyCustomRange,
}: DateRangeSelectorProps) => {
    const getIcon = (range: DateRangeType) => {
        switch (range) {
            case 'all':
                return <Squares2X2Icon className="h-4 w-4" />;
            case 'daily':
                return <ClockIcon className="h-4 w-4" />;
            case 'weekly':
                return <CalendarDaysIcon className="h-4 w-4" />;
            case 'monthly':
                return <CalendarIcon className="h-4 w-4" />;
            case 'yearly':
                return <CalendarIcon className="h-4 w-4" />;
            default:
                return null;
        }
    };

    return (
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 pb-1">
            <div className="flex gap-2">
                {(['all', 'daily', 'weekly', 'monthly', 'yearly'] as DateRangeType[]).map((range) => (
                    <button
                        key={range}
                        onClick={() => onDateRangeChange(range)}
                        className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-lg transition ${dateRange === range
                            ? 'bg-brand text-white'
                            : 'text-slate-600 hover:bg-slate-100'
                            }`}
                    >
                        {getIcon(range)}
                        {range.charAt(0).toUpperCase() + range.slice(1)}
                    </button>
                ))}
            </div>
            <div className="flex items-center gap-2 ml-auto">
                <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => onCustomStartDateChange(e.target.value)}
                    className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    placeholder="mm/dd/yyyy"
                />
                <span className="text-slate-500 text-sm">to</span>
                <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => onCustomEndDateChange(e.target.value)}
                    className="rounded-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                    placeholder="mm/dd/yyyy"
                />
                <button
                    onClick={onApplyCustomRange}
                    className="px-4 py-2 text-sm font-semibold text-white bg-brand rounded-sm hover:bg-brand/90 transition shadow-brand/30"
                >
                    Apply
                </button>
            </div>
        </div>
    );
};

export default DateRangeSelector;

