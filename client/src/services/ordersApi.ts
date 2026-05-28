/* eslint-disable @typescript-eslint/no-explicit-any */
import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type OrderItem = {
    product: string | { _id: string; name: string };
    productName: string;
    categoryId?: string;
    categoryName?: string;
    unit?: 'Dozen' | 'Cartoon';
    cartoonSize?: number;
    inputQty?: number;
    free?: number;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
};

export type Order = {
    _id: string;
    orderNumber: string;
    customer: {
        name: string;
        phone?: string;
        email?: string;
        address?: string;
    };
    customerId?: string;
    status: 'pending' | 'completed' | 'partial' | 'depo_due';
    totalAmount: number;
    subtotal?: number;
    discount?: number;
    tax?: number;
    previousDue?: number;
    paidAmount?: number;
    paymentDate?: string;
    paymentMethod?: string;
    additionalCharges?: number;
    notes?: string;
    createdAt: string;
    items: OrderItem[];
};

export type OrdersResponse = {
    meta: {
        total: number;
        page: number;
        limit: number;
    };
    result: Order[];
};

export type CreateOrderInput = {
    customer: {
        name: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    customerId?: string;
    items: {
        product: string;
        productName: string;
        categoryName?: string;
        unit?: 'Dozen' | 'Cartoon';
        cartoonSize?: number;
        inputQty?: number;
        free?: number;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
    }[];
    subtotal: number;
    discount?: number;
    tax?: number;
    totalAmount: number;
    previousDue?: number;
    paidAmount?: number;
    paymentDate?: string;
    paymentMethod?: string;
    status?: 'pending' | 'completed' | 'partial';
    notes?: string;
};

export const ordersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getOrders: builder.query<OrdersResponse, { page?: number; status?: string; sortBy?: string; search?: string; limit?: number; date?: string; startDate?: string; endDate?: string } | void>({
            query: (params) => {
                const queryParams: Record<string, any> = { ...params };
                if (queryParams.search) {
                    queryParams.searchTerm = queryParams.search;
                    delete queryParams.search;
                }
                return {
                    url: '/orders',
                    params: queryParams,
                };
            },
            transformResponse: (response: ApiResponse<Order[]>) => ({
                result: response.data,
                meta: response.meta as OrdersResponse['meta'],
            }),
            providesTags: ['Orders'],
        }),
        updateOrder: builder.mutation<Order, { id: string; data: Partial<Order> }>({
            query: ({ id, data }) => ({
                url: `/orders/${id}`,
                method: 'PATCH',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Order>) => response.data,
            invalidatesTags: ['Orders', 'Products'],
        }),
        deleteOrder: builder.mutation<void, string>({
            query: (id) => ({
                url: `/orders/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Orders', 'Products'],
        }),
        createOrder: builder.mutation<Order, CreateOrderInput>({
            query: (data) => ({
                url: '/orders',
                method: 'POST',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Order>) => response.data,
            invalidatesTags: ['Orders', 'Products'],
        }),
        getOrderById: builder.query<Order, string>({
            query: (id) => `/orders/${id}`,
            transformResponse: (response: ApiResponse<Order>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Orders', id }],
        }),
        getCustomerBalance: builder.query<{ balance: number }, string>({
            query: (customerId) => `/orders/customer-balance/${customerId}`,
            transformResponse: (response: ApiResponse<{ balance: number }>) => response.data,
        }),
    }),
});

export const {
    useGetOrdersQuery,
    useCreateOrderMutation,
    useGetOrderByIdQuery,
    useUpdateOrderMutation,
    useDeleteOrderMutation,
    useGetCustomerBalanceQuery,
} = ordersApi;

