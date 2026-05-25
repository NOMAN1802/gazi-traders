import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TSupplier } from './supplier.interface';
import { Supplier } from './supplier.model';

const createSupplier = async (
    payload: TSupplier,
    userId: string
): Promise<TSupplier> => {
    const supplier = await Supplier.create({
        ...payload,
        createdBy: userId,
    });

    return supplier;
};

const getSuppliers = async (
    query: Record<string, unknown>
): Promise<{ suppliers: TSupplier[]; total: number; page: number; limit: number }> => {
    const baseQuery = Supplier.find({ isDeleted: false });

    const supplierQuery = new QueryBuilder(baseQuery, query)
        .search(['name', 'contactPerson', 'phone', 'address'])
        .filter()
        .sort()
        .paginate()
        .fields();

    const [suppliers, total] = await Promise.all([
        supplierQuery.modelQuery,
        Supplier.countDocuments(supplierQuery.modelQuery.getFilter()),
    ]);

    const { page = 1, limit = 10 } = query;

    return {
        suppliers,
        total,
        page: Number(page),
        limit: Number(limit),
    };
};

const getSupplier = async (id: string): Promise<TSupplier | null> => {
    const supplier = await Supplier.findOne({ _id: id, isDeleted: false });

    if (!supplier) {
        throw new AppError(httpStatus.NOT_FOUND, 'Supplier not found');
    }

    return supplier;
};

const updateSupplier = async (
    id: string,
    payload: Partial<TSupplier>
): Promise<TSupplier | null> => {
    const supplier = await Supplier.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: payload },
        { new: true, runValidators: true }
    );

    if (!supplier) {
        throw new AppError(httpStatus.NOT_FOUND, 'Supplier not found');
    }

    return supplier;
};

const deleteSupplier = async (id: string): Promise<void> => {
    const supplier = await Supplier.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, status: 'inactive' } },
        { new: true }
    );

    if (!supplier) {
        throw new AppError(httpStatus.NOT_FOUND, 'Supplier not found');
    }
};

export const SupplierServices = {
    createSupplier,
    getSuppliers,
    getSupplier,
    updateSupplier,
    deleteSupplier,
};

