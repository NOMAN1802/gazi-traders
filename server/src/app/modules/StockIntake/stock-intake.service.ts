import mongoose from 'mongoose';
import httpStatus from 'http-status';
import AppError from '../../errors/AppError';
import { Product } from '../Product/product.model';
import { TStockIntake } from './stock-intake.interface';
import { StockIntake } from './stock-intake.model';

const createStockIntake = async (
  payload: Pick<TStockIntake, 'items' | 'notes'>,
  userId: string
) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    for (const item of payload.items) {
      const product = await Product.findOne({ _id: item.product, isDeleted: false }).session(session);
      if (!product) {
        throw new AppError(httpStatus.NOT_FOUND, `Product "${item.productName}" not found`);
      }
      // Add received pieces to product stock
      if (item.receivedPieces > 0) {
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stockQuantity: item.receivedPieces } },
          { session }
        );
      }
    }

    const allReceived = payload.items.every((i) => i.pendingQty === 0);
    const status = allReceived ? 'complete' : 'partial';

    const intake = new StockIntake({
      items: payload.items,
      notes: payload.notes,
      status,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    await intake.save({ session });

    await session.commitTransaction();
    return intake;
  } catch (err) {
    await session.abortTransaction();
    throw err;
  } finally {
    session.endSession();
  }
};

const getAllStockIntakes = async (query: Record<string, unknown>) => {
  const { page = 1, limit = 20, status, search } = query;
  const filter: Record<string, unknown> = { isDeleted: false };

  if (status && status !== 'all') filter.status = status;
  if (search) {
    filter.$or = [
      { intakeNumber: new RegExp(search as string, 'i') },
      { 'items.productName': new RegExp(search as string, 'i') },
    ];
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [result, total] = await Promise.all([
    StockIntake.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    StockIntake.countDocuments(filter),
  ]);

  return { result, meta: { total, page: Number(page), limit: Number(limit) } };
};

const getStockIntakeById = async (id: string) => {
  const result = await StockIntake.findById(id);
  if (!result) throw new AppError(httpStatus.NOT_FOUND, 'Stock intake not found');
  return result;
};

export const StockIntakeServices = {
  createStockIntake,
  getAllStockIntakes,
  getStockIntakeById,
};
