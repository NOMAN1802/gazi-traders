import { baseApi } from './baseApi';
import type { ApiResponse } from './types';

export type Category = {
    _id: string;
    name: string;
    description?: string;
    isActive: boolean;
};

export type CreateCategoryInput = {
    name: string;
    description?: string;
};

export type CategoryListResponse = {
    categories: Category[];
    total: number;
    page: number;
    limit: number;
};

export const categoriesApi = baseApi.injectEndpoints({
    endpoints: (builder) => ({
        getCategories: builder.query<CategoryListResponse, { page?: number; search?: string; limit?: number }>({
            query: ({ page = 1, search, limit = 100 } = {}) => ({
                url: '/categories',
                params: {
                    page,
                    limit,
                    searchTerm: search,
                },
            }),
            transformResponse: (response: ApiResponse<CategoryListResponse>) => response.data,
            providesTags: (result) =>
                result
                    ? [
                        ...result.categories.map(({ _id }) => ({ type: 'Categories' as const, id: _id })),
                        { type: 'Categories' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Categories', id: 'LIST' }],
        }),
        getCategory: builder.query<Category, string>({
            query: (id) => ({
                url: `/categories/${id}`,
            }),
            transformResponse: (response: ApiResponse<Category>) => response.data,
            providesTags: (_result, _error, id) => [{ type: 'Categories', id }],
        }),
        createCategory: builder.mutation<Category, CreateCategoryInput>({
            query: (data) => ({
                url: '/categories',
                method: 'POST',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Category>) => response.data,
            invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
        }),
        updateCategory: builder.mutation<Category, { id: string; data: Partial<CreateCategoryInput> }>({
            query: ({ id, data }) => ({
                url: `/categories/${id}`,
                method: 'PATCH',
                body: data,
            }),
            transformResponse: (response: ApiResponse<Category>) => response.data,
            invalidatesTags: (_result, _error, { id }) => [
                { type: 'Categories', id },
                { type: 'Categories', id: 'LIST' },
            ],
        }),
        deleteCategory: builder.mutation<void, string>({
            query: (id) => ({
                url: `/categories/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [{ type: 'Categories', id: 'LIST' }],
        }),
    }),
});

export const {
    useGetCategoriesQuery,
    useGetCategoryQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation
} = categoriesApi;

