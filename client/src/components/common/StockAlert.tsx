import { useMemo, useState } from 'react';
import { ExclamationTriangleIcon, XMarkIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { useGetProductsQuery } from '@/services/productsApi';

type StockAlertProps = {
    onClose?: () => void;
    showCloseButton?: boolean;
};

const StockAlert = ({ onClose, showCloseButton = true }: StockAlertProps) => {
    const { data } = useGetProductsQuery({ limit: 1000 });
    const [expanded, setExpanded] = useState(false);

    const lowStockProducts = useMemo(() => {
        if (!data?.products) return [];
        return data.products.filter(product =>
            product.stockQuantity <= (product.minStockLevel || 10)
        );
    }, [data]);

    const outOfStockProducts = useMemo(() => {
        return lowStockProducts.filter(product => product.stockQuantity === 0);
    }, [lowStockProducts]);

    if (lowStockProducts.length === 0) return null;

    const visibleProducts = lowStockProducts.slice(0, 3);
    const hiddenCount = lowStockProducts.length - 3;

    return (
        <div className="rounded-sm border border-orange-200 bg-linear-to-r from-orange-50 to-amber-50 p-4 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-orange-100 shrink-0">
                    <ExclamationTriangleIcon className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Stock Alert</h3>
                    <div className="mt-1 space-y-1">
                        {outOfStockProducts.length > 0 && (
                            <p className="text-sm text-red-600">
                                <span className="font-semibold">{outOfStockProducts.length}</span> products are out of stock
                            </p>
                        )}
                        {lowStockProducts.length > outOfStockProducts.length && (
                            <p className="text-sm text-orange-600">
                                <span className="font-semibold">{lowStockProducts.length - outOfStockProducts.length}</span> products are running low
                            </p>
                        )}
                        <p className="text-xs text-slate-500">
                            Products: {visibleProducts.map(p => p.name).join(', ')}
                            {hiddenCount > 0 && (
                                <button
                                    onClick={() => setExpanded(v => !v)}
                                    className="ml-1 inline-flex items-center gap-0.5 font-semibold text-orange-600 hover:text-orange-800"
                                >
                                    {expanded ? (
                                        <>show less <ChevronUpIcon className="h-3 w-3" /></>
                                    ) : (
                                        <>+{hiddenCount} more <ChevronDownIcon className="h-3 w-3" /></>
                                    )}
                                </button>
                            )}
                        </p>
                    </div>

                    {/* Expanded product list */}
                    {expanded && (
                        <div className="mt-3 rounded-sm border border-orange-200 overflow-hidden">
                            <div className="px-3 py-2 border-b border-orange-200">
                                <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wide">All Low Stock Products ({lowStockProducts.length})</p>
                            </div>
                            <div className="divide-y divide-orange-100 max-h-52 overflow-y-auto">
                                {lowStockProducts.map(product => (
                                    <div key={product._id} className="flex items-center justify-between px-3 py-1.5">
                                        <span className="text-xs text-slate-800 truncate flex-1 pr-2">{product.name}</span>
                                        <span className={`text-[10px] font-semibold shrink-0 ${
                                            product.stockQuantity === 0 ? 'text-red-600' : 'text-orange-600'
                                        }`}>
                                            {product.stockQuantity === 0 ? 'Out of stock' : `Qty: ${product.stockQuantity}`}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
                {showCloseButton && onClose && (
                    <button
                        onClick={onClose}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:text-slate-600 shrink-0"
                    >
                        <XMarkIcon className="h-4 w-4" />
                    </button>
                )}
            </div>
        </div>
    );
};

export default StockAlert;
