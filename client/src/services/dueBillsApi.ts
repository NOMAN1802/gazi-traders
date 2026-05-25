import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type DueBillPayment = {
    _id?: string;
    amount: number;
    date: string;
    paymentMethod: 'cash' | 'bank_transfer' | 'mobile_banking' | 'cheque' | 'other';
    notes?: string;
};

export type DueBill = {
    _id: string;
    dueBillNumber: string;
    customerId?: string | { _id: string; name: string; phone?: string; email?: string; address?: string };
    customer: { name: string; phone?: string; email?: string; address?: string };
    partyName: string;
    amount: number;
    paidAmount: number;
    payments: DueBillPayment[];
    status: 'pending' | 'partial' | 'paid';
    notes?: string;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateDueBillInput = {
    customerId?: string;
    customer: { name: string; phone?: string; email?: string; address?: string };
    partyName: string;
    amount: number;
    notes?: string;
};

export type DueBillListResponse = {
    dueBills: DueBill[];
    total: number;
    page: number;
    limit: number;
};

export const dueBillsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getDueBills: builder.query<DueBillListResponse, { page?: number; search?: string; limit?: number; date?: string; startDate?: string; endDate?: string; customerId?: string } | void>({
            query: ({ page = 1, search, limit = 10, date, startDate, endDate, customerId } = {}) => {
                const params: Record<string, unknown> = { page, limit };
                if (search) params.searchTerm = search;
                if (date) params.date = date;
                if (startDate) params.startDate = startDate;
                if (endDate) params.endDate = endDate;
                if (customerId) params.customerId = customerId;
                return { url: '/due-bills', params };
            },
            transformResponse: (response: ApiResponse<DueBill[]>) => ({
                dueBills: response.data ?? [],
                total: (response.meta as Record<string, number>)?.total ?? 0,
                page: (response.meta as Record<string, number>)?.page ?? 1,
                limit: (response.meta as Record<string, number>)?.limit ?? 10,
            }),
            providesTags: (result) =>
                result?.dueBills
                    ? [...result.dueBills.map(({ _id }) => ({ type: 'DueBills' as const, id: _id })), { type: 'DueBills' as const, id: 'LIST' }]
                    : [{ type: 'DueBills' as const, id: 'LIST' }],
        }),
        getDueBillById: builder.query<DueBill, string>({
            query: (id) => ({ url: `/due-bills/${id}` }),
            transformResponse: (response: ApiResponse<DueBill>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'DueBills', id }],
        }),
        createDueBill: builder.mutation<DueBill, CreateDueBillInput>({
            query: (data) => ({ url: '/due-bills', method: 'POST', body: data }),
            transformResponse: (response: ApiResponse<DueBill>) => response.data,
            invalidatesTags: [{ type: 'DueBills', id: 'LIST' }],
        }),
        updateDueBill: builder.mutation<DueBill, { id: string; data: Partial<CreateDueBillInput> }>({
            query: ({ id, data }) => ({ url: `/due-bills/${id}`, method: 'PATCH', body: data }),
            transformResponse: (response: ApiResponse<DueBill>) => response.data,
            invalidatesTags: (_result, _error, { id }) => [{ type: 'DueBills', id }, { type: 'DueBills', id: 'LIST' }],
        }),
        payDueBill: builder.mutation<DueBill, { id: string; amount: number; paymentMethod: string; notes?: string }>({
            query: ({ id, ...body }) => ({ url: `/due-bills/${id}/pay`, method: 'POST', body }),
            transformResponse: (response: ApiResponse<DueBill>) => response.data,
            invalidatesTags: (_result, _error, { id }) => [{ type: 'DueBills', id }, { type: 'DueBills', id: 'LIST' }],
        }),
        deleteDueBill: builder.mutation<void, string>({
            query: (id) => ({ url: `/due-bills/${id}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'DueBills', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetDueBillsQuery,
    useGetDueBillByIdQuery,
    useCreateDueBillMutation,
    useUpdateDueBillMutation,
    usePayDueBillMutation,
    useDeleteDueBillMutation,
} = dueBillsApi;
