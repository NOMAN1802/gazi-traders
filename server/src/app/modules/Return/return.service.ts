import httpStatus from "http-status";
import mongoose from "mongoose";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { Product } from "../Product/product.model";
import { TReturn, TReturnItem } from "./return.interface";
import { Return } from "./return.model";
import { Order } from "../Order/order.model";
import { Expense } from "../Expense/expense.model";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const createReturn = async (payload: TReturn, userId: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate all products exist and prepare items
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

      // Calculate totalPrice for each item if not provided
      if (!item.totalPrice) {
        item.totalPrice = item.unitPrice * item.quantity;
      }

      // Increase stock quantity immediately (customer returning product to inventory)
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stockQuantity: item.quantity } },
        { session, new: true }
      );
    }

    // Link Order if orderNumber is provided
    let linkedOrder = null;
    if (payload.orderNumber) {
      linkedOrder = await Order.findOne({ orderNumber: payload.orderNumber }).session(session);
      if (linkedOrder) {
        payload.order = linkedOrder._id as any;
        payload.orderId = linkedOrder._id as any;
      }
    } else if (payload.orderId) {
      linkedOrder = await Order.findById(payload.orderId).session(session);
      if (linkedOrder) {
        payload.order = linkedOrder._id as any;
        payload.orderNumber = linkedOrder.orderNumber;
      }
    }

    // Match return items with order items and update order item's returnProducts
    if (linkedOrder && linkedOrder.items) {
      for (const returnItem of payload.items) {
        // Find matching order item by product
        const matchingOrderItemIndex = linkedOrder.items.findIndex(
          (orderItem) => orderItem.product.toString() === returnItem.product.toString()
        );

        if (matchingOrderItemIndex !== -1) {
          const orderItem = linkedOrder.items[matchingOrderItemIndex];
          returnItem.orderItemIndex = matchingOrderItemIndex;

          // Validate return quantity doesn't exceed order item quantity
          const currentReturnProducts = orderItem.returnProducts || 0;
          if (currentReturnProducts + returnItem.quantity > orderItem.quantity) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `Return quantity (${currentReturnProducts + returnItem.quantity}) exceeds order item quantity (${orderItem.quantity}) for product ${returnItem.productName}`
            );
          }
        }
      }
    }

    // Calculate subtotal and totalAmount from items
    payload.subtotal = payload.items.reduce((sum, item) => sum + item.totalPrice, 0);
    payload.totalAmount = payload.subtotal;

    // Create return entry
    payload.createdBy = new mongoose.Types.ObjectId(userId);
    const result = await Return.create([payload], { session });
    const returnEntry = result[0];

    // Update order items' returnId and returnProducts if linked to an order
    if (linkedOrder && linkedOrder.items) {
      const returnId = typeof returnEntry._id === 'string'
        ? new mongoose.Types.ObjectId(returnEntry._id)
        : returnEntry._id;

      for (const returnItem of payload.items) {
        if (returnItem.orderItemIndex !== undefined && linkedOrder.items[returnItem.orderItemIndex]) {
          const orderItem = linkedOrder.items[returnItem.orderItemIndex];
          orderItem.returnId = returnId;
          orderItem.returnProducts = (orderItem.returnProducts || 0) + returnItem.quantity;
        }
      }
      await linkedOrder.save({ session });
    }

    await session.commitTransaction();
    await session.endSession();

    // Generate PDF invoice (optional - can be done asynchronously)
    try {
      const invoiceDir = path.join(__dirname, '../../../invoices');
      fs.mkdirSync(invoiceDir, { recursive: true });
      const invoicePath = path.join(invoiceDir, `return_${returnEntry.returnNumber}.pdf`);
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(invoicePath));

      // Add content to PDF
      doc.fontSize(25).text('Return Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Return Number: ${returnEntry.returnNumber}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Customer: ${returnEntry.customer.name}`);
      if (returnEntry.customer.email) doc.text(`Email: ${returnEntry.customer.email}`);
      if (returnEntry.customer.phone) doc.text(`Phone: ${returnEntry.customer.phone}`);
      if (returnEntry.orderNumber) doc.text(`Original Order: ${returnEntry.orderNumber}`);
      doc.moveDown();
      doc.text('Items:');
      returnEntry.items.forEach((item: TReturnItem) => {
        doc.text(`${item.productName} - Qty: ${item.quantity} - Price: ৳${item.unitPrice} - Total: ৳${item.totalPrice}`);
      });
      doc.moveDown();
      doc.text(`Subtotal: ৳${returnEntry.subtotal}`);
      doc.text(`Total Return Amount: ৳${returnEntry.totalAmount}`);
      if (returnEntry.reason) doc.text(`Reason: ${returnEntry.reason}`);
      doc.end();
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      // Don't fail the return creation if PDF fails
    }

    return returnEntry;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

const getAllReturns = async (query: Record<string, unknown>) => {
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

  const returnQuery = new QueryBuilder(
    Return.find(dateFilter)
      .populate({
        path: "items.product",
        populate: [
          {
            path: "category",
            select: "name"
          },
          {
            path: "supplierId",
            select: "name",
            model: "Supplier"
          }
        ]
      })
      .populate("order")
      .populate("createdBy", "name email"),
    queryWithoutDate
  )
    .search(["customer.name", "orderNumber", "returnNumber"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await returnQuery.modelQuery;
  const meta = await returnQuery.countTotal();

  // Get supplier information for each return item (check product supplierId first, then expenses)
  const returnsWithSupplier = await Promise.all(
    result.map(async (returnEntry) => {
      const returnObj: any = returnEntry.toObject();

      // Process each item in the return to get supplier
      if (returnObj.items && Array.isArray(returnObj.items)) {
        for (const item of returnObj.items) {
          const product = item.product;
          const productId = product?._id || product;

          if (productId) {
            let supplierName: string | null = null;

            // First, check if product has supplierId populated
            if (product && product.supplierId) {
              if (typeof product.supplierId === 'object' && product.supplierId.name) {
                supplierName = product.supplierId.name;
              }
            }

            // If no supplier from product, check expenses
            if (!supplierName) {
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
                supplierName = typeof populatedSupplier === 'object' && 'name' in populatedSupplier && populatedSupplier.name
                  ? populatedSupplier.name
                  : null;
              }
            }

            // Add supplier name to item if found
            if (supplierName) {
              item.supplierName = supplierName;
            }
          }
        }
      }

      return returnObj;
    })
  );

  return {
    meta,
    result: returnsWithSupplier,
  };
};

const getReturnById = async (id: string) => {
  const result = await Return.findById(id)
    .populate({
      path: "items.product",
      populate: [
        {
          path: "category",
          select: "name"
        },
        {
          path: "supplierId",
          select: "name",
          model: "Supplier"
        }
      ]
    })
    .populate("order")
    .populate("createdBy", "name email");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Return entry not found");
  }

  // Add supplier names to items similar to getAllReturns
  const returnObj: any = result.toObject();

  if (returnObj.items && Array.isArray(returnObj.items)) {
    for (const item of returnObj.items) {
      const product = item.product;
      const productId = product?._id || product;

      if (productId) {
        let supplierName: string | null = null;

        // First, check if product has supplierId populated
        if (product && product.supplierId) {
          if (typeof product.supplierId === 'object' && product.supplierId.name) {
            supplierName = product.supplierId.name;
          }
        }

        // If no supplier from product, check expenses
        if (!supplierName) {
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
            supplierName = typeof populatedSupplier === 'object' && 'name' in populatedSupplier && populatedSupplier.name
              ? populatedSupplier.name
              : null;
          }
        }

        // Add supplier name to item if found
        if (supplierName) {
          item.supplierName = supplierName;
        }
      }
    }
  }

  return returnObj;
};

const updateReturn = async (id: string, payload: Partial<TReturn>) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const returnEntry = await Return.findById(id).session(session);

    if (!returnEntry) {
      throw new AppError(httpStatus.NOT_FOUND, "Return entry not found");
    }

    if (returnEntry.isDeleted) {
      throw new AppError(httpStatus.BAD_REQUEST, "Cannot update a deleted return");
    }

    // If items are being updated, handle stock adjustments
    if (payload.items && Array.isArray(payload.items)) {
      // Revert old stock increases
      for (const oldItem of returnEntry.items) {
        await Product.findByIdAndUpdate(
          oldItem.product,
          { $inc: { stockQuantity: -oldItem.quantity } },
          { session, new: true }
        );
      }

      // Apply new stock increases
      for (const newItem of payload.items) {
        // Validate product exists
        const product = await Product.findOne({
          _id: newItem.product,
          isDeleted: false,
        }).session(session);

        if (!product) {
          throw new AppError(
            httpStatus.NOT_FOUND,
            `Product ${newItem.productName} not found`
          );
        }

        // Calculate totalPrice if not provided
        if (!newItem.totalPrice) {
          newItem.totalPrice = newItem.unitPrice * newItem.quantity;
        }

        await Product.findByIdAndUpdate(
          newItem.product,
          { $inc: { stockQuantity: newItem.quantity } },
          { session, new: true }
        );
      }

      // Recalculate subtotal and totalAmount
      payload.subtotal = payload.items.reduce((sum, item) => sum + item.totalPrice, 0);
      payload.totalAmount = payload.subtotal;

      // Update order items' returnProducts if linked to an order
      if (returnEntry.orderId) {
        const order = await Order.findById(returnEntry.orderId).session(session);
        if (order && order.items) {
          // Revert old returnProducts
          for (const oldItem of returnEntry.items) {
            if (oldItem.orderItemIndex !== undefined && order.items[oldItem.orderItemIndex]) {
              const orderItem = order.items[oldItem.orderItemIndex];
              orderItem.returnProducts = Math.max(0, (orderItem.returnProducts || 0) - oldItem.quantity);
            }
          }

          // Apply new returnProducts
          for (const newItem of payload.items) {
            if (newItem.orderItemIndex !== undefined && order.items[newItem.orderItemIndex]) {
              const orderItem = order.items[newItem.orderItemIndex];
              const currentReturnProducts = orderItem.returnProducts || 0;
              
              // Validate return quantity doesn't exceed order item quantity
              if (currentReturnProducts + newItem.quantity > orderItem.quantity) {
                throw new AppError(
                  httpStatus.BAD_REQUEST,
                  `Return quantity (${currentReturnProducts + newItem.quantity}) exceeds order item quantity (${orderItem.quantity}) for product ${newItem.productName}`
                );
              }

              orderItem.returnProducts = currentReturnProducts + newItem.quantity;
            }
          }
          await order.save({ session });
        }
      }
    }

    const result = await Return.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
      session,
    });

    await session.commitTransaction();
    return result;

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const deleteReturn = async (id: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const returnEntry = await Return.findById(id).session(session);

    if (!returnEntry) {
      throw new AppError(httpStatus.NOT_FOUND, "Return entry not found");
    }

    if (!returnEntry.isDeleted) {
      // Decrease returnProducts in order items if return is linked to an order
      if (returnEntry.orderId) {
        const order = await Order.findById(returnEntry.orderId).session(session);
        if (order && order.items) {
          for (const returnItem of returnEntry.items) {
            if (returnItem.orderItemIndex !== undefined && order.items[returnItem.orderItemIndex]) {
              const orderItem = order.items[returnItem.orderItemIndex];
              const currentReturnProducts = orderItem.returnProducts || 0;
              orderItem.returnProducts = Math.max(0, currentReturnProducts - returnItem.quantity);
            }
          }
          await order.save({ session });
        }
      }

      // Decrease stock for all items (Revert the increase made at creation)
      for (const returnItem of returnEntry.items) {
        await Product.findByIdAndUpdate(
          returnItem.product,
          { $inc: { stockQuantity: -returnItem.quantity } },
          { session, new: true }
        );
      }

      // Soft delete
      await Return.findByIdAndUpdate(id, { isDeleted: true }, { session });
    }

    await session.commitTransaction();
    await session.endSession();

    return returnEntry;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

export const ReturnServices = {
  createReturn,
  getAllReturns,
  getReturnById,
  updateReturn,
  deleteReturn,
};
