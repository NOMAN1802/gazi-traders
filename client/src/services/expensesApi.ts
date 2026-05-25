/* eslint-disable @typescript-eslint/no-explicit-any */
import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type ExpenseCategory =
    | 'rent'
    | 'utilities'
    | 'supplies'
    | 'salaries'
    | 'product_purchase'
    | 'refund'
    | 'other';

export type Expense = {
    _id: string;
    title: string;
    category: ExpenseCategory;
    amount: number;
    date: string;
    description?: string;
    referenceId?: string | {
        _id: string;
        categoryName?: string;
        purchasePrice?: number;
        quantity?: number;
        name?: string;
    };
    referenceModel?: 'Product' | 'Order' | 'Return';
    supplier?: string | {
        _id: string;
        name: string;
        phone?: string;
        email?: string;
    };
    createdBy?: {
        name: string;
    };
    createdAt: string;
};

export type ExpensesResponse = {
    meta: {
        total: number;
        page: number;
        limit: number;
    };
    result: Expense[];
};

export const expensesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getExpenses: builder.query<ExpensesResponse, { page?: number; limit?: number; category?: string; search?: string } | void>({
            query: (params) => {
                const queryParams: Record<string, any> = { ...params };
                // Map 'search' to 'searchTerm' for backend compatibility
                if (queryParams.search !== undefined) {
                    if (queryParams.search) {
                        queryParams.searchTerm = queryParams.search;
                    }
                    delete queryParams.search;
                }
                return {
                    url: '/expenses',
                    params: queryParams,
                };
            },
            transformResponse: (response: ApiResponse<Expense[]>) => ({
                result: response.data,
                meta: response.meta as ExpensesResponse['meta'],
            }),
            providesTags: ['Expenses'],
        }),
        createExpense: builder.mutation<Expense, Partial<Expense>>({
            query: (data) => ({
                url: '/expenses',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Expenses', 'Reports'],
        }),
        updateExpense: builder.mutation<Expense, { id: string; data: Partial<Expense> }>({
            query: ({ id, data }) => ({
                url: `/expenses/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: ['Expenses', 'Reports'],
        }),
        deleteExpense: builder.mutation<void, string>({
            query: (id) => ({
                url: `/expenses/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Expenses', 'Reports'],
        }),
    }),
});

export const { useGetExpensesQuery, useCreateExpenseMutation, useUpdateExpenseMutation, useDeleteExpenseMutation } = expensesApi;

