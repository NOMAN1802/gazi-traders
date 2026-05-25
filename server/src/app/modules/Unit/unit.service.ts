import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { QueryBuilder } from '../../builder/QueryBuilder';
import { TUnit } from './unit.interface';
import { Unit } from './unit.model';

const ensureUniqueName = async (name: string, excludeId?: string) => {
    const filter: Record<string, unknown> = {
        name: { $regex: new RegExp(`^${name.trim()}$`, 'i') },
    };

    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    const exists = await Unit.findOne(filter);

    if (exists) {
        throw new AppError(
            httpStatus.BAD_REQUEST,
            'Unit with this name already exists'
        );
    }
};

const createUnit = async (
    payload: TUnit,
    userId: string
): Promise<TUnit> => {
    await ensureUniqueName(payload.name);

    const unit = await Unit.create({
        ...payload,
        name: payload.name.trim(),
        abbreviation: payload.abbreviation.trim(),
        createdBy: userId,
    });

    return unit;
};

const getUnits = async (
    query: Record<string, unknown>
): Promise<{ units: TUnit[]; total: number; page: number; limit: number }> => {
    const baseQuery = Unit.find({ isDeleted: false });

    const unitQuery = new QueryBuilder(baseQuery, query)
        .search(['name', 'abbreviation', 'description'])
        .filter()
        .sort()
        .paginate()
        .fields();

    const [units, total] = await Promise.all([
        unitQuery.modelQuery,
        Unit.countDocuments(unitQuery.modelQuery.getFilter()),
    ]);

    const { page = 1, limit = 10 } = query;

    return {
        units,
        total,
        page: Number(page),
        limit: Number(limit),
    };
};

const getUnit = async (id: string): Promise<TUnit | null> => {
    const unit = await Unit.findOne({ _id: id, isDeleted: false });

    if (!unit) {
        throw new AppError(httpStatus.NOT_FOUND, 'Unit not found');
    }

    return unit;
};

const updateUnit = async (
    id: string,
    payload: Partial<TUnit>
): Promise<TUnit | null> => {
    if (payload.name) {
        await ensureUniqueName(payload.name, id);
    }

    const unit = await Unit.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: payload },
        { new: true, runValidators: true }
    );

    if (!unit) {
        throw new AppError(httpStatus.NOT_FOUND, 'Unit not found');
    }

    return unit;
};

const deleteUnit = async (id: string): Promise<void> => {
    const unit = await Unit.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { $set: { isDeleted: true, isActive: false } },
        { new: true }
    );

    if (!unit) {
        throw new AppError(httpStatus.NOT_FOUND, 'Unit not found');
    }
};

export const UnitServices = {
    createUnit,
    getUnits,
    getUnit,
    updateUnit,
    deleteUnit,
};

