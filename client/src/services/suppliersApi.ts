import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type Supplier = {
    _id: string;
    name: string;
    contactPerson: string;
    phone: string;
    address: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
};

export type CreateSupplierInput = {
    name: string;
    contactPerson: string;
    phone: string;
    address: string;
    status?: 'active' | 'inactive';
};

export type SupplierListResponse = {
    suppliers: Supplier[];
    total: number;
    page: number;
    limit: number;
};

export const suppliersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getSuppliers: builder.query<SupplierListResponse, { page?: number; search?: string; limit?: number }>({
            query: ({ page = 1, search, limit = 100 } = {}) => ({
                url: '/suppliers',
                params: {
                    page,
                    limit,
                    searchTerm: search,
                },
            }),
            transformResponse: (response: ApiResponse<SupplierListResponse>) => response.data,
            providesTags: (result) =>
                result
                    ? [
                        ...result.suppliers.map(({ _id }) => ({ type: 'Suppliers' as const, id: _id })),
                        { type: 'Suppliers' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Suppliers', id: 'LIST' }],
        }),
        getSupplier: builder.query<Supplier, string>({
            query: (id) => ({
                url: `/suppliers/${id}`,
            }),
            transformResponse: (response: ApiResponse<Supplier>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Suppliers', id }],
        }),
        createSupplier: builder.mutation<Supplier, CreateSupplierInput>({
            query: (data) => ({
                url: '/suppliers',
                method: 'POST',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Supplier>) => response.data,
            invalidatesTags: [{ type: 'Suppliers', id: 'LIST' }],
        }),
        updateSupplier: builder.mutation<Supplier, { id: string; data: Partial<CreateSupplierInput> }>({
            query: ({ id, data }) => ({
                url: `/suppliers/${id}`,
                method: 'PATCH',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Supplier>) => response.data,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Suppliers', id },
                { type: 'Suppliers', id: 'LIST' },
            ],
        }),
        deleteSupplier: builder.mutation<void, string>({
            query: (id) => ({
                url: `/suppliers/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Suppliers', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetSuppliersQuery,
    useGetSupplierQuery,
    useCreateSupplierMutation,
    useUpdateSupplierMutation,
    useDeleteSupplierMutation
} = suppliersApi;

