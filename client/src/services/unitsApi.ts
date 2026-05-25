import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type Unit = {
    _id: string;
    name: string;
    abbreviation: string;
    description?: string;
    isActive: boolean;
};

export type CreateUnitInput = {
    name: string;
    abbreviation: string;
    description?: string;
};

export type UnitListResponse = {
    units: Unit[];
    total: number;
    page: number;
    limit: number;
};

export const unitsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getUnits: builder.query<UnitListResponse, { page?: number; search?: string; limit?: number }>({
            query: ({ page = 1, search, limit = 100 } = {}) => ({
                url: '/units',
                params: {
                    page,
                    limit,
                    searchTerm: search,
                },
            }),
            transformResponse: (response: ApiResponse<UnitListResponse>) => response.data,
            providesTags: (result) =>
                result
                    ? [
                        ...result.units.map(({ _id }) => ({ type: 'Units' as const, id: _id })),
                        { type: 'Units' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Units', id: 'LIST' }],
        }),
        getUnit: builder.query<Unit, string>({
            query: (id) => ({
                url: `/units/${id}`,
            }),
            transformResponse: (response: ApiResponse<Unit>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Units', id }],
        }),
        createUnit: builder.mutation<Unit, CreateUnitInput>({
            query: (data) => ({
                url: '/units',
                method: 'POST',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Unit>) => response.data,
            invalidatesTags: [{ type: 'Units', id: 'LIST' }],
        }),
        updateUnit: builder.mutation<Unit, { id: string; data: Partial<CreateUnitInput> }>({
            query: ({ id, data }) => ({
                url: `/units/${id}`,
                method: 'PATCH',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Unit>) => response.data,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Units', id },
                { type: 'Units', id: 'LIST' },
            ],
        }),
        deleteUnit: builder.mutation<void, string>({
            query: (id) => ({
                url: `/units/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Units', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetUnitsQuery,
    useGetUnitQuery,
    useCreateUnitMutation,
    useUpdateUnitMutation,
    useDeleteUnitMutation
} = unitsApi;

