type Status =
    | 'paid'
    | 'pending'
    | 'overdue'
    | 'partial'
    | 'draft'
    | 'completed'
    | 'partially paid'
    | 'active'
    | 'inactive'
    | 'depo_due'
    | 'settled'
    | 'distributor due';

const statusStyles: Record<Status, string> = {
    paid: 'bg-emerald-100 text-success',
    completed: 'bg-emerald-100 text-success',
    settled: 'bg-emerald-100 text-success',
    pending: 'bg-red-100 text-danger',
    'partially paid': 'bg-amber-100 text-warning',
    partial: 'bg-amber-100 text-warning',
    'distributor due': 'bg-red-100 text-danger',
    depo_due: 'bg-blue-100 text-blue-700',
    overdue: 'bg-rose-100 text-danger',
    draft: 'bg-slate-100 text-slate-500',
    active: 'bg-emerald-100 text-success',
    inactive: 'bg-slate-200 text-slate-500',
};

const STATUS_LABELS: Partial<Record<Status, string>> = {
    completed: 'Settled',
    pending: 'Distributor Due',
    partial: 'Distributor Due',
    depo_due: 'Depo Due',
};

const StatusBadge = ({ status }: { status: string }) => {
    const key = status.toLowerCase() as Status;
    const classes = statusStyles[key] ?? 'bg-slate-100 text-slate-500';
    const label = STATUS_LABELS[key] ?? status;
    return (
        <span className={`inline-flex rounded-sm px-3 py-1 text-xs font-semibold capitalize ${classes}`}>
            {label}
        </span>
    );
};

export default StatusBadge;

