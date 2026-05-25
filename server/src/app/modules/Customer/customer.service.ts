import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TCustomer } from './customer.interface';
import { Customer } from './customer.model';

const createCustomer = async (payload: TCustomer, userId: string): Promise<TCustomer> => {
    return Customer.create({ ...payload, createdBy: userId });
};

const getCustomers = async (
    query: Record<string, unknown>
): Promise<{ customers: TCustomer[]; total: number; page: number; limit: number }> => {
    const baseQuery = Customer.find({ isDeleted: false });

    const customerQuery = new QueryBuilder(baseQuery, query)
        .search(['name', 'phone', 'email', 'address'])
        .filter()
        .sort()
        .paginate()
        .fields();

    const [customers, total] = await Promise.all([
        customerQuery.modelQuery,
        Customer.countDocuments(customerQuery.modelQuery.getFilter()),
    ]);

    return {
        customers,
        total,
        page: Number(query.page ?? 1),
        limit: Number(query.limit ?? 10),
    };
};

const getCustomer = async (id: string): Promise<TCustomer | null> => {
    const customer = await Customer.findOne({ _id: id, isDeleted: false });
    if (!customer) throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
    return customer;
};

const updateCustomer = async (id: string, payload: Partial<TCustomer>): Promise<TCustomer | null> => {
    const customer = await Customer.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: payload },
        { new: true, runValidators: true }
    );
    if (!customer) throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
    return customer;
};

const deleteCustomer = async (id: string): Promise<void> => {
    const customer = await Customer.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, status: 'inactive' } },
        { new: true }
    );
    if (!customer) throw new AppError(httpStatus.NOT_FOUND, 'Customer not found');
};

export const CustomerServices = {
    createCustomer,
    getCustomers,
    getCustomer,
    updateCustomer,
    deleteCustomer,
};
