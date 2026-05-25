interface BusinessOverviewCardsProps {
    cards: Array<{
        label: string;
        value: string | number;
        delta: string;
        deltaLabel: string;
        color: 'green' | 'red' | 'orange' | 'purple';
        icon: string;
    }>;
}

const BusinessOverviewCards = ({ cards }: BusinessOverviewCardsProps) => {
    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Business Overview</h2>
                <p className="text-sm text-slate-500">Key operational metrics and inventory information</p>
            </div>
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {cards.map((card) => (
                    <div key={card.label} className="group relative overflow-hidden rounded-sm border border-white/70 bg-linear-to-br from-white/95 to-slate-50/95 p-6 shadow-lg shadow-slate-200/40 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-slate-200/60 hover:-translate-y-1">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="text-lg">{card.icon}</span>
                                    <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">{card.label}</p>
                                </div>
                                <p className={`text-2xl font-bold ${card.color === 'green' ? 'text-emerald-600' :
                                    card.color === 'red' ? 'text-red-600' :
                                        card.color === 'orange' ? 'text-orange-600' :
                                            'text-purple-600'
                                    } group-hover:scale-105 transition-transform duration-300`}>
                                    {card.value}
                                </p>
                                <p className="text-xs uppercase tracking-widest text-slate-400 mt-1">{card.deltaLabel}</p>
                            </div>
                            <div className={`rounded-sm p-2 ${card.color === 'green' ? 'bg-emerald-100' :
                                card.color === 'red' ? 'bg-red-100' :
                                    card.color === 'orange' ? 'bg-orange-100' :
                                        'bg-purple-100'
                                } opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
                                <div className={`h-2 w-2 rounded-sm ${card.color === 'green' ? 'bg-emerald-500' :
                                    card.color === 'red' ? 'bg-red-500' :
                                        card.color === 'orange' ? 'bg-orange-500' :
                                            'bg-purple-500'
                                    }`}></div>
                            </div>
                        </div>
                        <div className="mt-3 flex items-center">
                            <span className={`text-xs font-semibold ${card.delta.startsWith('+') ? 'text-emerald-600' : 'text-red-500'
                                }`}>
                                {card.delta}
                            </span>
                            <span className="ml-1 text-xs text-slate-400">vs previous period</span>
                        </div>
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 transition-opacity duration-300 ${card.color === 'green' ? 'bg-emerald-500' :
                            card.color === 'red' ? 'bg-red-500' :
                                card.color === 'orange' ? 'bg-orange-500' :
                                    'bg-purple-500'
                            }`}></div>
                    </div>
                ))}
            </section>
        </div>
    );
};

export default BusinessOverviewCards;

