import type { Supplier } from '@/services/suppliersApi';

const PALETTE = [
    { color: '#2B6CB0', bg: '#EBF4FB', border: '#cfe1f1' },
    { color: '#E67E22', bg: '#FDF1E5', border: '#f5d9bf' },
    { color: '#5C6CFF', bg: '#E6E9FF', border: '#c7ccff' },
    { color: '#14C08A', bg: '#E6FAF4', border: '#b0eddb' },
];

function palette(index: number) {
    return PALETTE[index % PALETTE.length];
}

type Props = {
    value: string;
    onChange: (id: string) => void;
    suppliers: Supplier[];
    productCounts?: Record<string, number>;
};

export default function ProductLineTabs({ value, onChange, suppliers, productCounts }: Props) {
    if (suppliers.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2" role="tablist">
            {suppliers.map((s, i) => {
                const { color, bg, border } = palette(i);
                const isOn = value === s._id;
                const count = productCounts?.[s._id];
                return (
                    <button
                        key={s._id}
                        role="tab"
                        aria-selected={isOn}
                        onClick={() => onChange(s._id)}
                        className={`flex items-center gap-2 rounded-sm px-4 py-2.5 text-xs font-semibold transition-all duration-200 border ${
                            isOn ? 'text-white shadow-md' : 'bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                        style={
                            isOn
                                ? { background: color, borderColor: color }
                                : { borderColor: border, background: bg }
                        }
                    >
                        <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ background: isOn ? 'rgba(255,255,255,0.7)' : color }}
                        />
                        <span>{s.name}</span>
                        {count != null && (
                            <span
                                className="text-[9px]"
                                style={{ opacity: isOn ? 0.7 : 0.6 }}
                            >
                                · {count} SKUs
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
