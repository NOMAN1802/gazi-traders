/* eslint-disable @typescript-eslint/no-explicit-any */
import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type PurchaseItem = {
    product: string | { _id: string; name: string };
    productName: string;
    categoryId?: string;
    categoryName?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    markupPercent?: number;
    sellingPrice?: number;
};

export type Purchase = {
    _id: string;
    purchaseNumber: string;
    supplier: {
        _id?: string;
        name: string;
        contactPerson?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    status: 'pending' | 'completed' | 'partial';
    totalAmount: number;
    subtotal?: number;
    discount?: number;
    tax?: number;
    additionalCharges?: number;
    paidAmount?: number;
    paymentMethod?: string;
    notes?: string;
    createdAt: string;
    items: PurchaseItem[];
};

export type PurchasesResponse = {
    meta: {
        total: number;
        page: number;
        limit: number;
    };
    result: Purchase[];
};

export type CreatePurchaseInput = {
    supplier: {
        _id?: string;
        name: string;
        contactPerson?: string;
        email?: string;
        phone?: string;
        address?: string;
    };
    items: {
        product: string;
        productName: string;
        quantity: number;
        unitPrice: number;
        totalPrice: number;
        markupPercent?: number;
        sellingPrice?: number;
    }[];
    subtotal: number;
    discount?: number;
    tax?: number;
    additionalCharges?: number;
    totalAmount: number;
    paymentMethod?: string;
    notes?: string;
};

export const purchasesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getPurchases: builder.query<PurchasesResponse, { page?: number; status?: string; sortBy?: string; search?: string; limit?: number; date?: string } | void>({
            query: (params) => {
                const queryParams: Record<string, any> = { ...params };
                if (queryParams.search) {
                    queryParams.searchTerm = queryParams.search;
                    delete queryParams.search;
                }
                return {
                    url: '/purchases',
                    params: queryParams,
                };
            },
            transformResponse: (response: ApiResponse<Purchase[]>) => ({
                result: response.data,
                meta: response.meta as PurchasesResponse['meta'],
            }),
            providesTags: ['Purchases'],
        }),
        updatePurchase: builder.mutation<Purchase, { id: string; data: Partial<Purchase> }>({
            query: ({ id, data }) => ({
                url: `/purchases/${id}`,
                method: 'PATCH',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Purchase>) => response.data,
            invalidatesTags: ['Purchases', 'Products'],
        }),
        deletePurchase: builder.mutation<void, string>({
            query: (id) => ({
                url: `/purchases/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Purchases', 'Products'],
        }),
        createPurchase: builder.mutation<Purchase, CreatePurchaseInput>({
            query: (data) => ({
                url: '/purchases',
                method: 'POST',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Purchase>) => response.data,
            invalidatesTags: ['Purchases', 'Products', 'Expenses'],
        }),
        getPurchaseById: builder.query<Purchase, string>({
            query: (id) => `/purchases/${id}`,
            transformResponse: (response: ApiResponse<Purchase>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Purchases', id }],
        }),
    }),
});

export const {
    useGetPurchasesQuery,
    useCreatePurchaseMutation,
    useGetPurchaseByIdQuery,
    useUpdatePurchaseMutation,
    useDeletePurchaseMutation,
} = purchasesApi;

