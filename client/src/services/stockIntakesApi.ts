import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type StockIntakeItem = {
    product: string;
    productName: string;
    categoryName?: string;
    unit?: 'Dozen' | 'Cartoon';
    cartoonSize?: number;
    orderedQty: number;
    receivedQty: number;
    pendingQty: number;
    orderedPieces: number;
    receivedPieces: number;
    pendingPieces: number;
};

export type StockIntake = {
    _id: string;
    intakeNumber: string;
    items: StockIntakeItem[];
    notes?: string;
    status: 'complete' | 'partial';
    createdAt: string;
};

export type StockIntakesResponse = {
    meta: { total: number; page: number; limit: number };
    result: StockIntake[];
};

export type CreateStockIntakeInput = {
    items: StockIntakeItem[];
    notes?: string;
};

export const stockIntakesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getStockIntakes: builder.query<StockIntakesResponse, { page?: number; status?: string; search?: string; limit?: number } | void>({
            query: (params) => ({ url: '/stock-intakes', params: params ?? {} }),
            transformResponse: (response: ApiResponse<StockIntake[]>) => ({
                result: response.data,
                meta: response.meta as StockIntakesResponse['meta'],
            }),
            providesTags: ['StockIntakes'],
        }),
        createStockIntake: builder.mutation<StockIntake, CreateStockIntakeInput>({
            query: (data) => ({ url: '/stock-intakes', method: 'POST', body: data }),
            transformResponse: (response: ApiResponse<StockIntake>) => response.data,
            invalidatesTags: ['StockIntakes', 'Products'],
        }),
        getStockIntakeById: builder.query<StockIntake, string>({
            query: (id) => `/stock-intakes/${id}`,
            transformResponse: (response: ApiResponse<StockIntake>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'StockIntakes', id }],
        }),
    }),
});

export const {
    useGetStockIntakesQuery,
    useCreateStockIntakeMutation,
    useGetStockIntakeByIdQuery,
} = stockIntakesApi;
