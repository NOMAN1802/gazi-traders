import { RectangleStackIcon } from '@heroicons/react/24/outline';

const UNITS = [
    {
        name: 'Dozen',
        abbreviation: 'Doz',
        description: '1 Dozen = 12 pieces. Enter quantity in dozens and the system auto-converts to pieces.',
        color: 'blue',
    },
    {
        name: 'Cartoon',
        abbreviation: 'Ctn',
        description: 'Pieces per cartoon are set per product. Enter cartoon count and the system auto-converts to pieces.',
        color: 'orange',
    },
];

const UnitsPage = () => {
    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Product Management</p>
                <h1 className="mt-2 text-3xl font-bold text-slate-900">Units</h1>
                <p className="mt-1 text-sm text-slate-500">Fixed units used across all products in this system.</p>
            </div>

            {/* Stats Card */}
            <div className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-lg">📏</span>
                            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">Total Units</p>
                        </div>
                        <p className="text-2xl font-bold text-purple-600">2</p>
                        <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">Fixed / System Defined</p>
                    </div>
                    <div className="rounded-sm p-2 bg-purple-100 opacity-60">
                        <RectangleStackIcon className="h-5 w-5 text-purple-500" />
                    </div>
                </div>
            </div>

            {/* Units List */}
            <section className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                        <thead className="text-xs font-semibold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="py-3 pr-4">S/N</th>
                                <th className="py-3 pr-4">Unit Name</th>
                                <th className="py-3 pr-4">Abbreviation</th>
                                <th className="py-3 pr-4">Description</th>
                                <th className="py-3">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-600">
                            {UNITS.map((unit, idx) => (
                                <tr key={unit.name} className="hover:bg-slate-50/70 transition">
                                    <td className="py-4 pr-4 text-slate-400 text-xs">{idx + 1}</td>
                                    <td className="py-4 pr-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${unit.color === 'blue' ? 'bg-blue-50' : 'bg-orange-50'}`}>
                                                <RectangleStackIcon className={`h-5 w-5 ${unit.color === 'blue' ? 'text-blue-500' : 'text-orange-500'}`} />
                                            </div>
                                            <p className="font-semibold text-slate-900">{unit.name}</p>
                                        </div>
                                    </td>
                                    <td className="py-4 pr-4">
                                        <span className={`inline-flex items-center rounded-sm px-3 py-1 text-xs font-semibold ${unit.color === 'blue' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>
                                            {unit.abbreviation}
                                        </span>
                                    </td>
                                    <td className="py-4 pr-4 text-slate-600 max-w-md">{unit.description}</td>
                                    <td className="py-4">
                                        <span className="inline-flex items-center rounded-sm bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                            Active
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
};

export default UnitsPage;
