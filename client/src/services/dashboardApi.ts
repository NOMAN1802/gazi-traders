import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type DashboardSummary = {
    inventory: { totalProducts: number; lowStockProducts: number; outOfStockProducts: number; totalStockValue: number };
    orders: { total: number; completed: number; pending: number; partial: number };
    financial: { revenue: number; expenses: number; profit: number; discount: number; tax: number; outstanding: number };
    returns: { count: number; value: number };
    damages: { count: number; value: number };
    users: { total: number };
    recentOrders: Array<{
        _id: string;
        orderNumber: string;
        totalAmount: number;
        status: string;
        createdAt: string;
        customer?: { name: string };
        paymentMethod?: string;
    }>;
    topProducts: Array<{
        _id: string;
        productName: string;
        totalQuantity: number;
        totalRevenue: number;
    }>;
    activities: Array<{
        type: string;
        action: string;
        user: string;
        timestamp: string;
        details?: Record<string, unknown>;
    }>;
};

export const dashboardApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDashboard: builder.query<DashboardSummary, { startDate?: string; endDate?: string } | void>({
            query: (params) => ({
                url: '/dashboard',
                params: params || undefined,
            }),
            transformResponse: (response: ApiResponse<DashboardSummary>) => response.data,
            providesTags: ['Dashboard'],
        }),
    }),
});

export const { useGetDashboardQuery } = dashboardApi;

