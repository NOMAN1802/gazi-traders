/* eslint-disable @typescript-eslint/no-unused-vars */
import httpStatus from "http-status";
import mongoose from "mongoose";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { Product } from "../Product/product.model";
import { TOrder, TOrderItem } from "./order.interface";
import { Order } from "./order.model";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const createOrder = async (payload: TOrder, userId: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    // Validate products exist and deduct stock immediately
    for (const item of payload.items) {
      const product = await Product.findOne({
        _id: item.product,
        isDeleted: false,
      })
        .populate('category', 'name')
        .session(session);

      if (!product) {
        throw new AppError(
          httpStatus.NOT_FOUND,
          `Product ${item.productName} not found`
        );
      }

      // Check stock availability
      if (product.stockQuantity < item.quantity) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`
        );
      }

      // Populate category information in order item
      if (product.category && typeof product.category === 'object' && 'name' in product.category) {
        const category = product.category as { _id: mongoose.Types.ObjectId; name: string };
        item.categoryId = category._id;
        item.categoryName = category.name;
      } else if (product.categoryName) {
        item.categoryName = product.categoryName;
        if (product.category && typeof product.category === 'object' && '_id' in product.category) {
          const category = product.category as { _id: mongoose.Types.ObjectId };
          item.categoryId = category._id;
        }
      }

      // Initialize damageProducts and returnProducts to 0
      item.damageProducts = 0;
      item.returnProducts = 0;

      // Immediately deduct stock from product (regardless of payment status)
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stockQuantity: -item.quantity } },
        { session, new: true }
      );
    }

    // Generate order number
    const count = await Order.countDocuments().session(session);
    const orderNumber = `ORD-${String(count + 1).padStart(6, '0')}`;

    // Create order with generated order number
    payload.orderNumber = orderNumber;
    payload.createdBy = new mongoose.Types.ObjectId(userId);
    payload.status = payload.status || 'pending';

    const order = new Order(payload);
    await order.save({ session });

    await session.commitTransaction();
    await session.endSession();

    // Generate PDF invoice (optional - can be done asynchronously)
    try {
      const invoiceDir = path.join(__dirname, '../../../invoices');
      fs.mkdirSync(invoiceDir, { recursive: true });
      const invoicePath = path.join(invoiceDir, `invoice_${order.orderNumber}.pdf`);
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(invoicePath));

      // Add content to PDF
      doc.fontSize(25).text('Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Order Number: ${order.orderNumber}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Customer: ${order.customer.name}`);
      if (order.customer.email) doc.text(`Email: ${order.customer.email}`);
      if (order.customer.phone) doc.text(`Phone: ${order.customer.phone}`);
      if (order.customer.address) doc.text(`Address: ${order.customer.address}`);
      doc.moveDown();
      doc.text('Items:');
      order.items.forEach((item: TOrderItem) => {
        doc.text(`${item.productName} - Qty: ${item.quantity} - Price: ৳${item.unitPrice} - Total: ৳${item.totalPrice}`);
      });
      doc.moveDown();
      doc.text(`Subtotal: ৳${order.subtotal}`);
      doc.text(`Discount: ৳${order.discount || 0}`);
      doc.text(`Tax: ৳${order.tax || 0}`);
      doc.text(`Additional Charges: ৳${order.additionalCharges || 0}`);
      doc.text(`Grand Total: ৳${order.totalAmount}`);
      doc.end();
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      // Don't fail the order creation if PDF fails
    }

    return order;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

const getAllOrders = async (query: Record<string, unknown>) => {
  // Handle date filtering
  const dateFilter: Record<string, unknown> = { isDeleted: false };

  if (query.startDate || query.endDate) {
    const dateRange: Record<string, unknown> = {};
    if (query.startDate) {
      dateRange.$gte = new Date(query.startDate as string);
    }
    if (query.endDate) {
      dateRange.$lte = new Date(query.endDate as string);
    }
    dateFilter.createdAt = dateRange;
  } else if (query.date) {
    const dateStr = query.date as string;
    // Parse date string (YYYY-MM-DD) and create date range in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);

    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    dateFilter.createdAt = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  }

  // Remove date params from query before passing to QueryBuilder
  const queryWithoutDate = { ...query };
  delete queryWithoutDate.date;
  delete queryWithoutDate.startDate;
  delete queryWithoutDate.endDate;

  const orderQuery = new QueryBuilder(
    Order.find(dateFilter)
      .populate("createdBy", "name email")
      .populate({
        path: "items.product",
        populate: {
          path: "category",
          select: "name"
        }
      }),
    queryWithoutDate
  )
    .search(["orderNumber", "customer.name", "customer.phone"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await orderQuery.modelQuery;
  const total = await orderQuery.countTotal();
  const { page = 1, limit = 10 } = query;

  return {
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
    },
    result,
  };
};

const getOrderById = async (id: string) => {
  const result = await Order.findById(id)
    .populate("createdBy", "name email")
    .populate("items.product");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  return result;
};

const updateOrder = async (id: string, payload: Partial<TOrder>) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(id).session(session);

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, "Order not found");
    }

    // Check status transition rules
    if (order.status === "completed" || order.status === "depo_due") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot update an order that is already settled or has a depo due"
      );
    }

    // Prevent backward transitions from partial to pending
    if (order.status === "partial" && payload.status === "pending") {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Cannot change partial order back to unpaid"
      );
    }

    // Handle stock updates based on status change
    // Note: Stock is already deducted on order creation, so we only need to handle restoration
    // Note: order.status cannot be "completed" at this point due to earlier check
    if (payload.status && payload.status !== order.status) {
      const isCurrentlyPartial = order.status === "partial";
      const willBeCompleted = payload.status === "completed" || payload.status === "partial";

      // Stock is already deducted on creation, so no need to deduct again when changing status
      // Only restore stock if changing from partial back to pending (cancellation scenario)
      if (isCurrentlyPartial && !willBeCompleted) {
        for (const item of order.items) {
          await Product.findByIdAndUpdate(
            item.product,
            { $inc: { stockQuantity: item.quantity } },
            { session, new: true }
          );
        }
      }
    }

    // If items are being updated, populate category information for new/updated items
    if (payload.items && Array.isArray(payload.items)) {
      for (const item of payload.items) {
        const product = await Product.findOne({
          _id: item.product,
          isDeleted: false,
        })
          .populate('category', 'name')
          .session(session);

        if (product) {
          // Populate category information in order item
          if (product.category && typeof product.category === 'object' && 'name' in product.category) {
            const category = product.category as { _id: mongoose.Types.ObjectId; name: string };
            item.categoryId = category._id;
            item.categoryName = category.name;
          } else if (product.categoryName) {
            item.categoryName = product.categoryName;
            if (product.category && typeof product.category === 'object' && '_id' in product.category) {
              const category = product.category as { _id: mongoose.Types.ObjectId };
              item.categoryId = category._id;
            }
          }
        }

        // Initialize damageProducts and returnProducts to 0 if not already set
        if (item.damageProducts === undefined) {
          item.damageProducts = 0;
        }
        if (item.returnProducts === undefined) {
          item.returnProducts = 0;
        }
      }
    }

    const result = await Order.findByIdAndUpdate(id, payload, {
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

const deleteOrder = async (id: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const order = await Order.findById(id).session(session);

    if (!order) {
      throw new AppError(httpStatus.NOT_FOUND, "Order not found");
    }

    if (order.status === "completed" || order.status === "partial" || order.status === "depo_due") {
      throw new AppError(httpStatus.BAD_REQUEST, "Cannot delete a settled, partial, or depo-due order");
    }

    // Restore stock when deleting order (since stock was deducted on creation)
    for (const item of order.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stockQuantity: item.quantity } },
        { session, new: true }
      );
    }

    const result = await Order.findByIdAndUpdate(
      id,
      { isDeleted: true },
      { new: true, session }
    );

    await session.commitTransaction();
    return result;
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
};

const getCustomerBalance = async (customerId: string) => {
  const orders = await Order.find({ customerId, isDeleted: false });
  const balance = orders.reduce(
    (sum, o) => sum + o.totalAmount - (o.paidAmount ?? 0),
    0
  );
  return { balance };
};

export const OrderServices = {
  createOrder,
  getAllOrders,
  getOrderById,
  updateOrder,
  deleteOrder,
  getCustomerBalance,
};
