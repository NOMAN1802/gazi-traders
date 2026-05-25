import mongoose from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { TPendingProduct, TPendingProductStatus } from './pending-product.interface';
import { PendingProduct } from './pending-product.model';

type CreateItemPayload = {
  productName: string;
  code?: string;
  quantity: number;
  amount: number;
  supplierName?: string;
};

const createPendingProducts = async (
  items: CreateItemPayload[],
  createdBy: string
): Promise<TPendingProduct[]> => {
  const docs = items.map((item) => ({
    ...item,
    status: 'pending' as const,
    createdBy: new mongoose.Types.ObjectId(createdBy),
  }));

  const result = await PendingProduct.insertMany(docs);
  return result as unknown as TPendingProduct[];
};

const getAllPendingProducts = async (
  query: Record<string, unknown>
): Promise<{ result: TPendingProduct[]; meta: { total: number; page: number; limit: number } }> => {
  const { page = 1, limit = 20, search, status, startDate, endDate } = query;

  const filter: Record<string, unknown> = { isDeleted: false };

  if (search) {
    const searchRegex = new RegExp(search as string, 'i');
    filter.$or = [{ productName: searchRegex }, { code: searchRegex }];
  }

  if (status && status !== 'all') {
    filter.status = status;
  }

  if (startDate || endDate) {
    const dateRange: Record<string, unknown> = {};
    if (startDate) dateRange.$gte = new Date(startDate as string);
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      dateRange.$lte = end;
    }
    filter.createdAt = dateRange;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [result, total] = await Promise.all([
    PendingProduct.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    PendingProduct.countDocuments(filter),
  ]);

  return {
    result: result as unknown as TPendingProduct[],
    meta: { total, page: Number(page), limit: Number(limit) },
  };
};

const getPendingProductStats = async (query: Record<string, unknown> = {}) => {
  const baseMatch: Record<string, unknown> = { isDeleted: false };

  if (query.startDate || query.endDate) {
    const dateRange: Record<string, unknown> = {};
    if (query.startDate) dateRange.$gte = new Date(query.startDate as string);
    if (query.endDate) {
      const end = new Date(query.endDate as string);
      end.setHours(23, 59, 59, 999);
      dateRange.$lte = end;
    }
    baseMatch.createdAt = dateRange;
  }

  const [totalAgg, pendingAgg, partialAgg, receivedAgg] = await Promise.all([
    PendingProduct.aggregate([
      { $match: baseMatch },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    PendingProduct.aggregate([
      { $match: { ...baseMatch, status: 'pending' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
    PendingProduct.aggregate([
      { $match: { ...baseMatch, status: 'partial_received' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' }, receivedAmount: { $sum: '$receivedAmount' } } },
    ]),
    PendingProduct.aggregate([
      { $match: { ...baseMatch, status: 'received' } },
      { $group: { _id: null, count: { $sum: 1 }, amount: { $sum: '$amount' } } },
    ]),
  ]);

  return {
    total: { count: totalAgg[0]?.count || 0, amount: totalAgg[0]?.amount || 0 },
    pending: { count: pendingAgg[0]?.count || 0, amount: pendingAgg[0]?.amount || 0 },
    partial_received: { count: partialAgg[0]?.count || 0, amount: partialAgg[0]?.amount || 0, receivedAmount: partialAgg[0]?.receivedAmount || 0 },
    received: { count: receivedAgg[0]?.count || 0, amount: receivedAgg[0]?.amount || 0 },
  };
};

const updatePendingProduct = async (
  id: string,
  payload: Partial<TPendingProduct> & { partialAmount?: number }
): Promise<TPendingProduct | null> => {
  const item = await PendingProduct.findOne({ _id: id, isDeleted: false });
  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Pending product not found');
  }

  // Accumulate for each partial receive
  if (payload.status === 'partial_received' && payload.receivedQuantity !== undefined) {
    const newQty = payload.receivedQuantity;
    const newAmount = payload.partialAmount || 0;
    const totalReceived = (item.receivedQuantity || 0) + newQty;
    const totalAmount = (item.receivedAmount || 0) + newAmount;
    const finalStatus: TPendingProductStatus = totalReceived >= item.quantity ? 'received' : 'partial_received';

    const result = await PendingProduct.findByIdAndUpdate(
      id,
      {
        $set: { status: finalStatus, receivedQuantity: totalReceived, receivedAmount: totalAmount },
        $push: { partialReceives: { quantity: newQty, amount: newAmount, date: new Date() } },
      },
      { new: true, runValidators: true }
    );
    return result as unknown as TPendingProduct | null;
  }

  const result = await PendingProduct.findByIdAndUpdate(
    id,
    { $set: payload },
    { new: true, runValidators: true }
  );
  return result as unknown as TPendingProduct | null;
};

const deletePendingProduct = async (id: string): Promise<boolean> => {
  const item = await PendingProduct.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!item) {
    throw new AppError(httpStatus.NOT_FOUND, 'Pending product not found');
  }

  return true;
};

export const PendingProductServices = {
  createPendingProducts,
  getAllPendingProducts,
  getPendingProductStats,
  updatePendingProduct,
  deletePendingProduct,
};
