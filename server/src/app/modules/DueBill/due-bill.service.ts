import httpStatus from 'http-status';
import mongoose from 'mongoose';
import { QueryBuilder } from '../../builder/QueryBuilder';
import AppError from '../../errors/AppError';
import { TDueBill } from './due-bill.interface';
import { DueBill } from './due-bill.model';

const createDueBill = async (payload: TDueBill, userId: string) => {
  payload.createdBy = new mongoose.Types.ObjectId(userId);
  payload.paidAmount = 0;
  payload.payments = [];
  payload.status = 'pending';

  const dueBill = new DueBill(payload);
  await dueBill.save();
  return dueBill;
};

const getAllDueBills = async (query: Record<string, unknown>) => {
  const dateFilter: Record<string, unknown> = { isDeleted: false };

  if (query.customerId) {
    dateFilter.customerId = new mongoose.Types.ObjectId(query.customerId as string);
  }

  if (query.startDate || query.endDate) {
    const dateRange: Record<string, unknown> = {};
    if (query.startDate) dateRange.$gte = new Date(query.startDate as string);
    if (query.endDate) dateRange.$lte = new Date(query.endDate as string);
    dateFilter.createdAt = dateRange;
  } else if (query.date) {
    const dateStr = query.date as string;
    const [year, month, day] = dateStr.split('-').map(Number);
    dateFilter.createdAt = {
      $gte: new Date(year, month - 1, day, 0, 0, 0, 0),
      $lte: new Date(year, month - 1, day, 23, 59, 59, 999),
    };
  }

  const queryWithoutDate = { ...query };
  delete queryWithoutDate.date;
  delete queryWithoutDate.startDate;
  delete queryWithoutDate.endDate;
  delete queryWithoutDate.customerId;

  const dueBillQuery = new QueryBuilder(
    DueBill.find(dateFilter)
      .populate('createdBy', 'name email')
      .populate('customerId', 'name phone email'),
    queryWithoutDate
  )
    .search(['customer.name', 'partyName', 'dueBillNumber'])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await dueBillQuery.modelQuery;
  const total = await dueBillQuery.countTotal();
  const { page = 1, limit = 10 } = query;

  return {
    meta: { total, page: Number(page), limit: Number(limit) },
    result,
  };
};

const getDueBillById = async (id: string) => {
  const result = await DueBill.findById(id)
    .populate('createdBy', 'name email')
    .populate('customerId', 'name phone email');

  if (!result || result.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Due bill not found');
  }
  return result;
};

const updateDueBill = async (id: string, payload: Partial<TDueBill>) => {
  const dueBill = await DueBill.findById(id);
  if (!dueBill || dueBill.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Due bill not found');
  }
  if (dueBill.status === 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'Cannot edit a fully paid due bill');
  }

  const result = await DueBill.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
  return result;
};

const payDueBill = async (
  id: string,
  paymentData: { amount: number; paymentMethod: string; notes?: string }
) => {
  const dueBill = await DueBill.findById(id);
  if (!dueBill || dueBill.isDeleted) {
    throw new AppError(httpStatus.NOT_FOUND, 'Due bill not found');
  }
  if (dueBill.status === 'paid') {
    throw new AppError(httpStatus.BAD_REQUEST, 'This due bill is already fully paid');
  }

  const remainingAmount = dueBill.amount - dueBill.paidAmount;
  if (paymentData.amount > remainingAmount) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Payment (৳${paymentData.amount}) exceeds remaining due (৳${remainingAmount})`
    );
  }

  const newPaidAmount = dueBill.paidAmount + paymentData.amount;
  dueBill.paidAmount = newPaidAmount;
  dueBill.status = newPaidAmount >= dueBill.amount ? 'paid' : newPaidAmount > 0 ? 'partial' : 'pending';
  dueBill.payments.push({
    amount: paymentData.amount,
    date: new Date(),
    paymentMethod: paymentData.paymentMethod as 'cash' | 'bank_transfer' | 'mobile_banking' | 'cheque' | 'other',
    notes: paymentData.notes,
  });

  await dueBill.save();
  return dueBill;
};

const deleteDueBill = async (id: string) => {
  const dueBill = await DueBill.findById(id);
  if (!dueBill) {
    throw new AppError(httpStatus.NOT_FOUND, 'Due bill not found');
  }
  const result = await DueBill.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
  return result;
};

export const DueBillServices = {
  createDueBill,
  getAllDueBills,
  getDueBillById,
  updateDueBill,
  payDueBill,
  deleteDueBill,
};
