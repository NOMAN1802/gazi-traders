import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type Customer = {
    _id: string;
    name: string;
    phone?: string;
    address?: string;
    status: 'active' | 'inactive';
    createdAt: string;
    updatedAt: string;
};

export type CreateCustomerInput = {
    name: string;
    phone?: string;
    address?: string;
    status?: 'active' | 'inactive';
};

export type CustomerListResponse = {
    customers: Customer[];
    total: number;
    page: number;
    limit: number;
};

export const customersApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCustomer: builder.query<Customer, string>({
            query: (id) => ({ url: `/customers/${id}` }),
            transformResponse: (response: ApiResponse<Customer>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Customers', id }],
        }),
        getCustomers: builder.query<CustomerListResponse, { page?: number; search?: string; limit?: number }>({
            query: ({ page = 1, search, limit = 100 } = {}) => ({
                url: '/customers',
                params: { page, limit, searchTerm: search },
            }),
            transformResponse: (response: ApiResponse<CustomerListResponse>) => response.data,
            providesTags: (result) =>
                result
                    ? [
                        ...result.customers.map(({ _id }) => ({ type: 'Customers' as const, id: _id })),
                        { type: 'Customers' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Customers', id: 'LIST' }],
        }),
        createCustomer: builder.mutation<Customer, CreateCustomerInput>({
            query: (data) => ({
                url: '/customers',
                method: 'POST',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Customer>) => response.data,
            invalidatesTags: [{ type: 'Customers', id: 'LIST' }],
        }),
        updateCustomer: builder.mutation<Customer, { id: string; data: Partial<CreateCustomerInput> }>({
            query: ({ id, data }) => ({
                url: `/customers/${id}`,
                method: 'PATCH',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Customer>) => response.data,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Customers', id },
                { type: 'Customers', id: 'LIST' },
            ],
        }),
        deleteCustomer: builder.mutation<void, string>({
            query: (id) => ({
                url: `/customers/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Customers', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetCustomerQuery,
    useGetCustomersQuery,
    useCreateCustomerMutation,
    useUpdateCustomerMutation,
    useDeleteCustomerMutation,
} = customersApi;
