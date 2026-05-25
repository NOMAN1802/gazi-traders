import { useMemo } from 'react';
import {
    ShoppingBagIcon,
    ExclamationTriangleIcon,
    ArrowTrendingUpIcon,
    CurrencyDollarIcon
} from '@heroicons/react/24/outline';
import { useGetProductsQuery } from '@/services/productsApi';

const InventoryStats = () => {
    const { data, isLoading } = useGetProductsQuery({ limit: 1000 });

    const stats = useMemo(() => {
        if (!data?.products) {
            return {
                totalProducts: 0,
                totalValue: 0,
                lowStockItems: 0,
                outOfStockItems: 0,
                avgStockValue: 0,
            };
        }

        const products = data.products;
        const totalProducts = products.length;
        const totalValue = products.reduce((sum, p) => sum + (p.sellingPrice * p.stockQuantity), 0);
        const lowStockItems = products.filter(p => p.stockQuantity <= (p.minStockLevel || 10)).length;
        const outOfStockItems = products.filter(p => p.stockQuantity === 0).length;
        const avgStockValue = totalProducts > 0 ? totalValue / totalProducts : 0;

        return {
            totalProducts,
            totalValue,
            lowStockItems,
            outOfStockItems,
            avgStockValue,
        };
    }, [data?.products]);

    if (isLoading) {
        return (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                    <div key={i} className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card animate-pulse">
                        <div className="h-4 bg-slate-200 rounded mb-3"></div>
                        <div className="h-8 bg-slate-200 rounded mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                    </div>
                ))}
            </div>
        );
    }

    const inventoryCards = [
        {
            label: 'Total Products',
            value: stats.totalProducts,
            icon: <ShoppingBagIcon className="h-5 w-5" />,
            bgColor: 'bg-blue-50',
            textColor: 'text-blue-600',
        },
        {
            label: 'Inventory Value',
            value: `৳${stats.totalValue.toLocaleString()}`,
            icon: <CurrencyDollarIcon className="h-5 w-5" />,
            bgColor: 'bg-green-50',
            textColor: 'text-green-600',
        },
        {
            label: 'Low Stock Items',
            value: stats.lowStockItems,
            icon: <ExclamationTriangleIcon className="h-5 w-5" />,
            bgColor: 'bg-orange-50',
            textColor: 'text-orange-600',
        },
        {
            label: 'Out of Stock',
            value: stats.outOfStockItems,
            icon: <ArrowTrendingUpIcon className="h-5 w-5" />,
            bgColor: 'bg-red-50',
            textColor: 'text-red-600',
        },
    ];

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-slate-900">Inventory Overview</h2>
                <p className="text-sm text-slate-500">Real-time inventory status and analytics</p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {inventoryCards.map((card) => (
                    <div key={card.label} className="rounded-sm border border-white/70 bg-white/90 p-6 shadow-card">
                        <div className="flex items-center gap-3">
                            <div className={`flex h-10 w-10 items-center justify-center rounded-sm ${card.bgColor}`}>
                                <div className={card.textColor}>
                                    {card.icon}
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-slate-500">{card.label}</p>
                                <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default InventoryStats;
