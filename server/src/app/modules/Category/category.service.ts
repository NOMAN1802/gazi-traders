import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TCategory } from './category.interface';
import { Category } from './category.model';
import { Product } from '../Product/product.model';

const ensureUniqueName = async (name: string, excludeId?: string) => {
    const filter: Record<string, unknown> = {
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    };

    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    const exists = await Category.findOne(filter);

    if (exists) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            'Category with this name already exists'
        );
    }
};

const createCategory = async (
    payload: TCategory,
    userId: string
): Promise<TCategory> => {
    await ensureUniqueName(payload.name);

    const category = await Category.create({
        ...payload,
        name: payload.name.trim(),
        createdBy: userId,
    });

    return category;
};

const getCategories = async (
    query: Record<string, unknown>
): Promise<{ categories: TCategory[]; total: number; page: number; limit: number }> => {
    const baseQuery = Category.find({ isDeleted: false });

    const categoryQuery = new QueryBuilder(baseQuery, query)
        .search(['name', 'description'])
        .filter()
        .sort()
        .paginate()
        .fields();

    const [categories, total] = await Promise.all([
        categoryQuery.modelQuery,
        Category.countDocuments(categoryQuery.modelQuery.getFilter()),
    ]);

    const { page = 1, limit = 10 } = query;

    return {
        categories,
        total,
        page: Number(page),
        limit: Number(limit),
    };
};

const getCategory = async (id: string): Promise<TCategory | null> => {
    const category = await Category.findOne({ _id: id, isDeleted: false });

    if (!category) {
        throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
    }

    return category;
};

const updateCategory = async (
    id: string,
    payload: Partial<TCategory>
): Promise<TCategory | null> => {
    if (payload.name) {
        await ensureUniqueName(payload.name, id);
    }

    const category = await Category.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: payload },
        { new: true, runValidators: true }
    );

    if (!category) {
        throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
    }

    if (payload.name) {
        await Product.updateMany(
            { category: id },
            { $set: { categoryName: category.name } }
        );
    }

    return category;
};

const deleteCategory = async (id: string): Promise<void> => {
    const category = await Category.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, isActive: false } },
        { new: true }
    );

    if (!category) {
        throw new AppError(httpStatus.NOT_FOUND, 'Category not found');
    }

    await Product.updateMany(
        { category: id },
        { $set: { isDeleted: true } }
    );
};

export const CategoryServices = {
    createCategory,
    getCategories,
    getCategory,
    updateCategory,
    deleteCategory,
};

