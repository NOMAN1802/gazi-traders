/* eslint-disable @typescript-eslint/no-explicit-any */
import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type Product = {
    _id: string;
    name: string;
    sku?: string;
    categoryName?: string;
    unit: string;
    sellingPrice: number;
    purchasePrice: number;
    stockQuantity: number;
    minStockLevel?: number;
    description?: string;
    supplierId?: string;
};

export type CreateProductInput = {
    name: string;
    sku?: string;
    categoryName?: string;
    unit: string;
    purchasePrice: number;
    sellingPrice: number;
    stockQuantity: number;
    minStockLevel?: number;
    description?: string;
    supplierId?: string;
};

export type ProductListResponse = {
    products: Product[];
    total: number;
    page: number;
    limit: number;
};

export const productsApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getProducts: builder.query<ProductListResponse, { page?: number; search?: string; limit?: number; categoryId?: string }>({
            query: ({ page = 1, search, limit = 30, categoryId } = {}) => {
                const params: Record<string, any> = {
                    page,
                    limit,
                };
                if (search) params.search = search;
                if (categoryId) params.categoryId = categoryId;
                return {
                    url: '/products',
                    params,
                };
            },
            transformResponse: (response: ApiResponse<ProductListResponse>) => response.data,
            providesTags: (result) =>
                result
                    ? [
                        ...result.products.map(({ _id }) => ({ type: 'Products' as const, id: _id })),
                        { type: 'Products' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Products', id: 'LIST' }],
        }),
        getProduct: builder.query<Product, string>({
            query: (id) => ({
                url: `/products/${id}`,
            }),
            transformResponse: (response: ApiResponse<Product>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Products', id }],
        }),
        createProduct: builder.mutation<Product, CreateProductInput>({
            query: (data) => ({
                url: '/products',
                method: 'POST',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Product>) => response.data,
            invalidatesTags: [{ type: 'Products', id: 'LIST' }, 'Expenses'],
        }),
        updateProduct: builder.mutation<Product, { id: string; data: Partial<CreateProductInput> }>({
            query: ({ id, data }) => ({
                url: `/products/${id}`,
                method: 'PATCH',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Product>) => response.data,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Products', id },
                { type: 'Products', id: 'LIST' },
            ],
        }),
        deleteProduct: builder.mutation<void, string>({
            query: (id) => ({
                url: `/products/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Products', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetProductsQuery,
    useGetProductQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation
} = productsApi;

