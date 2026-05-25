import httpStatus from "http-status";
import mongoose from "mongoose";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { Product } from "../Product/product.model";
import { Expense } from "../Expense/expense.model";
import { Order } from "../Order/order.model";
import { TDamage, TDamageItem } from "./damage.interface";
import { Damage } from "./damage.model";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const createDamage = async (payload: TDamage, userId: string) => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      // Validate all products exist and have sufficient stock
      for (const item of payload.items) {
        const product = await Product.findOne({
          _id: item.product,
          isDeleted: false,
        }).session(session);

        if (!product) {
          throw new AppError(
            httpStatus.NOT_FOUND,
            `Product ${item.productName} not found`
          );
        }

        if (product.stockQuantity < item.quantity) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Insufficient stock to report damage for ${item.productName}. Available: ${product.stockQuantity}, Required: ${item.quantity}`
          );
        }

        // Calculate totalLoss for each item if not provided
        if (!item.totalLoss) {
          item.totalLoss = item.unitCost * item.quantity;
        }

        // Handle supplier: if not provided, fetch from product's most recent purchase expense
        if (!item.supplier) {
          const expense = await Expense.findOne({
            referenceId: item.product,
            referenceModel: "Product",
            category: "product_purchase",
          })
            .populate("supplier", "name")
            .sort({ createdAt: -1 })
            .limit(1)
            .session(session);

          if (expense && expense.supplier) {
            const populatedSupplier = expense.supplier as any;
            item.supplier = typeof populatedSupplier === 'object' && '_id' in populatedSupplier
              ? populatedSupplier._id as mongoose.Types.ObjectId
              : new mongoose.Types.ObjectId(populatedSupplier as string);
            if (typeof populatedSupplier === 'object' && 'name' in populatedSupplier && populatedSupplier.name) {
              item.supplierName = populatedSupplier.name;
            }
          }
        } else if (typeof item.supplier === 'string') {
          item.supplier = new mongoose.Types.ObjectId(item.supplier);
        }

        // Immediately deduct stock from product
        await Product.findByIdAndUpdate(
          item.product,
          { $inc: { stockQuantity: -item.quantity } },
          { session, new: true }
        );
      }

      // Link Order if orderNumber is provided
      let linkedOrder = null;
      if (payload.orderNumber) {
        linkedOrder = await Order.findOne({ orderNumber: payload.orderNumber }).session(session);
        if (linkedOrder) {
          payload.orderId = linkedOrder._id as any;
        }
      } else if (payload.orderId) {
        linkedOrder = await Order.findById(payload.orderId).session(session);
        if (linkedOrder) {
          payload.orderNumber = linkedOrder.orderNumber;
        }
      }

      // Match damage items with order items and update order item's damageProducts
      if (linkedOrder && linkedOrder.items) {
        for (const damageItem of payload.items) {
          // Find matching order item by product
          const matchingOrderItemIndex = linkedOrder.items.findIndex(
            (orderItem) => orderItem.product.toString() === damageItem.product.toString()
          );

          if (matchingOrderItemIndex !== -1) {
            const orderItem = linkedOrder.items[matchingOrderItemIndex];
            damageItem.orderItemIndex = matchingOrderItemIndex;

            // Validate damage quantity doesn't exceed order item quantity
            const currentDamageProducts = orderItem.damageProducts || 0;
            if (currentDamageProducts + damageItem.quantity > orderItem.quantity) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `Damage quantity (${currentDamageProducts + damageItem.quantity}) exceeds order item quantity (${orderItem.quantity}) for product ${damageItem.productName}`
              );
            }
          }
        }
      }

      // Calculate subtotal and totalLoss from items
      payload.subtotal = payload.items.reduce((sum, item) => sum + item.totalLoss, 0);
      payload.totalLoss = payload.subtotal;

      // Convert customerId string to ObjectId if provided
      if (payload.customerId && typeof payload.customerId === 'string') {
        payload.customerId = new mongoose.Types.ObjectId(payload.customerId);
      }

      // Create damage entry
      payload.createdBy = new mongoose.Types.ObjectId(userId);
      const result = await Damage.create([payload], { session });
      const damageEntry = result[0];

      // Update order items' damageId and damageProducts if linked to an order
      if (linkedOrder && linkedOrder.items) {
        const damageId = typeof damageEntry._id === 'string'
          ? new mongoose.Types.ObjectId(damageEntry._id)
          : damageEntry._id;

        for (const damageItem of payload.items) {
          if (damageItem.orderItemIndex !== undefined && linkedOrder.items[damageItem.orderItemIndex]) {
            const orderItem = linkedOrder.items[damageItem.orderItemIndex];
            orderItem.damageId = damageId;
            orderItem.damageProducts = (orderItem.damageProducts || 0) + damageItem.quantity;
          }
        }
        await linkedOrder.save({ session });
      }

      // Update related product_purchase expenses by reducing the damage amount
      for (const item of payload.items) {
        if (item.totalLoss && item.totalLoss > 0) {
          // Find expenses related to this product with product_purchase category
          const productExpenses = await Expense.find({
            category: "product_purchase",
            referenceId: item.product,
            referenceModel: "Product",
            amount: { $gt: 0 }
          }).session(session);

          if (productExpenses.length > 0) {
            // Reduce expense amounts by the damage amount (FIFO approach)
            let remainingDamageAmount = item.totalLoss;

            for (const expense of productExpenses) {
              if (remainingDamageAmount <= 0) break;

              if (expense.amount > 0) {
                const reductionAmount = Math.min(expense.amount, remainingDamageAmount);

                await Expense.findByIdAndUpdate(
                  expense._id,
                  {
                    $inc: { amount: -reductionAmount }
                  },
                  { session, new: true }
                );

                remainingDamageAmount -= reductionAmount;
              }
            }
          }
        }
      }

      await session.commitTransaction();
      await session.endSession();

      // Generate PDF invoice (optional - can be done asynchronously)
      try {
        const invoiceDir = path.join(__dirname, '../../../invoices');
        fs.mkdirSync(invoiceDir, { recursive: true });
        const invoicePath = path.join(invoiceDir, `damage_${damageEntry.damageNumber}.pdf`);
        const doc = new PDFDocument();
        doc.pipe(fs.createWriteStream(invoicePath));

        // Add content to PDF
        doc.fontSize(25).text('Damage Report', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Damage Number: ${damageEntry.damageNumber}`);
        doc.text(`Date: ${new Date().toLocaleDateString()}`);
        if (damageEntry.orderNumber) doc.text(`Order Number: ${damageEntry.orderNumber}`);
        doc.moveDown();
        doc.text('Items:');
        damageEntry.items.forEach((item: TDamageItem) => {
          doc.text(`${item.productName} - Qty: ${item.quantity} - Cost: ৳${item.unitCost} - Total: ৳${item.totalLoss} - Type: ${item.damageType}`);
        });
        doc.moveDown();
        doc.text(`Subtotal: ৳${damageEntry.subtotal}`);
        doc.text(`Total Loss: ৳${damageEntry.totalLoss}`);
        if (damageEntry.notes) doc.text(`Notes: ${damageEntry.notes}`);
        doc.end();
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        // Don't fail the damage creation if PDF fails
      }

      return damageEntry;
    } catch (error: any) {
      await session.abortTransaction();
      await session.endSession();

      // Check if it's a transient transaction error
      const isTransientError = error.errorLabels && error.errorLabels.includes('TransientTransactionError');
      const isWriteConflict = error.code === 112 || error.codeName === 'WriteConflict';

      if ((isTransientError || isWriteConflict) && retries < maxRetries - 1) {
        retries++;
        console.log(`=== Retrying transaction (attempt ${retries}/${maxRetries}) ===`);
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
        continue;
      }

      throw error;
    }
  }

  throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to create damage after multiple retries");
};

const getAllDamages = async (query: Record<string, unknown>) => {
  // Handle date filtering
  const dateFilter: Record<string, unknown> = { isDeleted: { $ne: true } };

  if (query.startDate || query.endDate) {
    const dateRange: Record<string, unknown> = {};
    if (query.startDate) {
      dateRange.$gte = new Date(query.startDate as string);
    }
    if (query.endDate) {
      dateRange.$lte = new Date(query.endDate as string);
    }
    dateFilter.createdAt = dateRange;
  }

  // Remove date params from query before passing to QueryBuilder
  const queryWithoutDate: Record<string, unknown> = { ...query };
  delete queryWithoutDate.startDate;
  delete queryWithoutDate.endDate;

  const damageQuery = new QueryBuilder(
    Damage.find(dateFilter)
      .populate({
        path: "items.product",
        populate: {
          path: "category",
          select: "name"
        }
      })
      .populate("items.supplier", "name phone email")
      .populate("orderId")
      .populate("customerId", "name phone address")
      .populate("createdBy", "name email"),
    queryWithoutDate
  )
    .search(["damageNumber", "orderNumber"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await damageQuery.modelQuery;
  const meta = await damageQuery.countTotal();

  // Fetch supplier information for each damage item
  const damagesWithSupplier = await Promise.all(
    result.map(async (damageEntry: any) => {
      const damageObj = damageEntry.toObject();

      if (damageObj.items && Array.isArray(damageObj.items)) {
        for (const item of damageObj.items) {
          const productId = item.product?._id || item.product;

          if (productId && !item.supplier) {
            const expense = await Expense.findOne({
              referenceId: productId,
              referenceModel: "Product",
              category: "product_purchase",
            })
              .populate("supplier", "name")
              .sort({ createdAt: -1 })
              .limit(1);

            if (expense && expense.supplier) {
              if (typeof item.product === 'object') {
                item.product = {
                  ...item.product,
                  supplier: expense.supplier,
                };
              }
              const populatedSupplier = expense.supplier as any;
              if (typeof populatedSupplier === 'object' && 'name' in populatedSupplier && populatedSupplier.name) {
                item.supplierName = populatedSupplier.name;
              }
            }
          }
        }
      }
      return damageObj;
    })
  );

  return {
    meta,
    result: damagesWithSupplier,
  };
};

const getDamageById = async (id: string) => {
  const result = await Damage.findById(id)
    .populate({
      path: "items.product",
      populate: {
        path: "category",
        select: "name"
      }
    })
    .populate("items.supplier", "name phone email")
    .populate("orderId")
    .populate("customerId", "name phone address")
    .populate("createdBy", "name email");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Damage entry not found");
  }

  // Fetch supplier information if missing
  const damageObj = result.toObject();
  if (damageObj.items && Array.isArray(damageObj.items)) {
    for (const item of damageObj.items) {
      const productId = item.product?._id || item.product;
      if (productId && !item.supplier) {
        const expense = await Expense.findOne({
          referenceId: productId,
          referenceModel: "Product",
          category: "product_purchase",
        })
          .populate("supplier", "name")
          .sort({ createdAt: -1 })
          .limit(1);

        if (expense && expense.supplier) {
          const populatedSupplier = expense.supplier as any;
          if (typeof populatedSupplier === 'object' && 'name' in populatedSupplier && populatedSupplier.name) {
            item.supplierName = populatedSupplier.name;
          }
        }
      }
    }
  }

  return damageObj;
};

const updateDamage = async (id: string, payload: Partial<TDamage>) => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const damage = await Damage.findById(id).session(session);

      if (!damage) {
        throw new AppError(httpStatus.NOT_FOUND, "Damage entry not found");
      }

      if (damage.isDeleted) {
        throw new AppError(httpStatus.BAD_REQUEST, "Cannot update a deleted damage entry");
      }

      // If items are being updated, handle stock adjustments
      if (payload.items && Array.isArray(payload.items)) {
        // Store old items for stock restoration
        const oldItems = damage.items || [];

        // Restore stock for old items
        for (const oldItem of oldItems) {
          await Product.findByIdAndUpdate(
            oldItem.product,
            { $inc: { stockQuantity: oldItem.quantity } },
            { session, new: true }
          );

          // Restore expenses if needed
          if (oldItem.totalLoss && oldItem.totalLoss > 0) {
            const productExpenses = await Expense.find({
              category: "product_purchase",
              referenceId: oldItem.product,
              referenceModel: "Product",
            }).session(session);

            if (productExpenses.length > 0) {
              const restorePerExpense = oldItem.totalLoss / productExpenses.length;
              for (const expense of productExpenses) {
                await Expense.findByIdAndUpdate(
                  expense._id,
                  { $inc: { amount: restorePerExpense } },
                  { session, new: true }
                );
              }
            }
          }
        }

        // Validate and process new items
        for (const item of payload.items) {
          const product = await Product.findOne({
            _id: item.product,
            isDeleted: false,
          }).session(session);

          if (!product) {
            throw new AppError(
              httpStatus.NOT_FOUND,
              `Product ${item.productName} not found`
            );
          }

          if (product.stockQuantity < item.quantity) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `Insufficient stock to report damage for ${item.productName}. Available: ${product.stockQuantity}, Required: ${item.quantity}`
            );
          }

          // Calculate totalLoss if not provided
          if (!item.totalLoss) {
            item.totalLoss = item.unitCost * item.quantity;
          }

          // Handle supplier if not provided
          if (!item.supplier) {
            const expense = await Expense.findOne({
              referenceId: item.product,
              referenceModel: "Product",
              category: "product_purchase",
            })
              .populate("supplier", "name")
              .sort({ createdAt: -1 })
              .limit(1)
              .session(session);

            if (expense && expense.supplier) {
              item.supplier = typeof expense.supplier === 'object' 
                ? expense.supplier._id as mongoose.Types.ObjectId
                : new mongoose.Types.ObjectId(expense.supplier);
              const populatedSupplier = expense.supplier as any;
              if (typeof populatedSupplier === 'object' && 'name' in populatedSupplier && populatedSupplier.name) {
                item.supplierName = populatedSupplier.name;
              }
            }
          } else if (typeof item.supplier === 'string') {
            item.supplier = new mongoose.Types.ObjectId(item.supplier);
          }

          // Deduct stock for new items
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stockQuantity: -item.quantity } },
            { session, new: true }
          );

          // Reduce expenses for new items
          if (item.totalLoss && item.totalLoss > 0) {
            const productExpenses = await Expense.find({
              category: "product_purchase",
              referenceId: item.product,
              referenceModel: "Product",
              amount: { $gt: 0 }
            }).session(session);

            if (productExpenses.length > 0) {
              let remainingDamageAmount = item.totalLoss;
              for (const expense of productExpenses) {
                if (remainingDamageAmount <= 0) break;
                if (expense.amount > 0) {
                  const reductionAmount = Math.min(expense.amount, remainingDamageAmount);
                  await Expense.findByIdAndUpdate(
                    expense._id,
                    { $inc: { amount: -reductionAmount } },
                    { session, new: true }
                  );
                  remainingDamageAmount -= reductionAmount;
                }
              }
            }
          }
        }

        // Recalculate subtotal and totalLoss
        payload.subtotal = payload.items.reduce((sum, item) => sum + item.totalLoss, 0);
        payload.totalLoss = payload.subtotal;
      } else {
        // If only subtotal/totalLoss changed, recalculate from existing items
        if (payload.subtotal !== undefined || payload.totalLoss !== undefined) {
          const currentItems = damage.items || [];
          payload.subtotal = currentItems.reduce((sum, item) => sum + item.totalLoss, 0);
          payload.totalLoss = payload.subtotal;
        }
      }

      const result = await Damage.findByIdAndUpdate(id, payload, {
        new: true,
        runValidators: true,
        session,
      });

      if (!result) {
        throw new AppError(httpStatus.NOT_FOUND, "Failed to update damage entry");
      }

      await session.commitTransaction();
      await session.endSession();
      return result;
    } catch (error: any) {
      await session.abortTransaction();
      await session.endSession();

      const isTransientError = error.errorLabels && error.errorLabels.includes('TransientTransactionError');
      const isWriteConflict = error.code === 112 || error.codeName === 'WriteConflict';

      if ((isTransientError || isWriteConflict) && retries < maxRetries - 1) {
        retries++;
        console.log(`=== Retrying update transaction (attempt ${retries}/${maxRetries}) ===`);
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
        continue;
      }

      throw error;
    }
  }

  throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to update damage after multiple retries");
};

const deleteDamage = async (id: string) => {
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    const session = await mongoose.startSession();

    try {
      session.startTransaction();

      const damage = await Damage.findById(id).session(session);

      if (!damage) {
        throw new AppError(httpStatus.NOT_FOUND, "Damage entry not found");
      }

      if (!damage.isDeleted) {
        // Restore stock for all items
        for (const item of damage.items) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stockQuantity: item.quantity } },
            { session, new: true }
          );

          // Restore expenses
          if (item.totalLoss && item.totalLoss > 0) {
            const productExpenses = await Expense.find({
              category: "product_purchase",
              referenceId: item.product,
              referenceModel: "Product",
            }).session(session);

            if (productExpenses.length > 0) {
              const restorePerExpense = item.totalLoss / productExpenses.length;
              for (const expense of productExpenses) {
                await Expense.findByIdAndUpdate(
                  expense._id,
                  { $inc: { amount: restorePerExpense } },
                  { session, new: true }
                );
              }
            }
          }
        }

        // Decrease damageProducts in order items if damage is linked to an order
        if (damage.orderId) {
          const order = await Order.findById(damage.orderId).session(session);
          if (order && order.items) {
            for (const item of damage.items) {
              if (item.orderItemIndex !== undefined && order.items[item.orderItemIndex]) {
                const orderItem = order.items[item.orderItemIndex];
                const currentDamageProducts = orderItem.damageProducts || 0;
                orderItem.damageProducts = Math.max(0, currentDamageProducts - item.quantity);
              }
            }
            await order.save({ session });
          }
        }

        // Soft delete
        await Damage.findByIdAndUpdate(id, { isDeleted: true }, { session });
      }

      await session.commitTransaction();
      await session.endSession();

      return damage;
    } catch (error: any) {
      await session.abortTransaction();
      await session.endSession();

      const isTransientError = error.errorLabels && error.errorLabels.includes('TransientTransactionError');
      const isWriteConflict = error.code === 112 || error.codeName === 'WriteConflict';

      if ((isTransientError || isWriteConflict) && retries < maxRetries - 1) {
        retries++;
        console.log(`=== Retrying delete transaction (attempt ${retries}/${maxRetries}) ===`);
        await new Promise(resolve => setTimeout(resolve, 100 * retries));
        continue;
      }

      throw error;
    }
  }

  throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, "Failed to delete damage after multiple retries");
};

export const DamageServices = {
  createDamage,
  getAllDamages,
  getDamageById,
  updateDamage,
  deleteDamage,
};
