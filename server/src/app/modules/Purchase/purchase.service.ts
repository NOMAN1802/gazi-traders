/* eslint-disable @typescript-eslint/no-unused-vars */
import httpStatus from "http-status";
import mongoose from "mongoose";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { Product } from "../Product/product.model";
import { TPurchase, TPurchaseItem } from "./purchase.interface";
import { Purchase } from "./purchase.model";
import { Expense } from "../Expense/expense.model";
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const createPurchase = async (payload: TPurchase, userId: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();
    
    // Debug: Log purchase payload
    console.log('Creating purchase with payload:', JSON.stringify(payload, null, 2));

    // Validate products exist and add stock
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

      // Populate category information in purchase item
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

      // Add stock to product and update prices
      const updateData: any = {
        $inc: { stockQuantity: item.quantity },
        $set: {
          purchasePrice: item.unitPrice,
        }
      };

      // Update selling price if provided
      if (item.sellingPrice !== undefined && item.sellingPrice !== null && item.sellingPrice >= 0) {
        updateData.$set.sellingPrice = item.sellingPrice;
      }

      // Update min stock level if provided
      if (item.minStockLevel !== undefined && item.minStockLevel !== null && item.minStockLevel >= 0) {
        updateData.$set.minStockLevel = item.minStockLevel;
      }

      await Product.findByIdAndUpdate(
        item.product,
        updateData,
        { session, new: true }
      );
    }

    // Generate purchase number
    const count = await Purchase.countDocuments().session(session);
    const purchaseNumber = `PUR-${String(count + 1).padStart(6, '0')}`;

    // Create purchase with generated purchase number
    payload.purchaseNumber = purchaseNumber;
    payload.createdBy = new mongoose.Types.ObjectId(userId);
    payload.status = payload.status || 'pending';

    const purchase = new Purchase(payload);
    await purchase.save({ session });
    
    // Debug: Log saved purchase
    console.log('Saved purchase:', JSON.stringify(purchase.toObject(), null, 2));

    // Create expense entry for the purchase
    if (payload.totalAmount > 0) {
      const expenseData: any = {
        title: `Purchase: ${purchaseNumber}`,
        category: 'product_purchase',
        amount: payload.totalAmount,
        date: new Date(),
        referenceId: purchase._id,
        referenceModel: 'Purchase',
        createdBy: new mongoose.Types.ObjectId(userId),
        description: `Purchase of ${payload.items.length} product(s) from ${payload.supplier.name}`,
      };

      // Add supplier if provided
      if (payload.supplier._id && mongoose.Types.ObjectId.isValid(payload.supplier._id)) {
        expenseData.supplier = new mongoose.Types.ObjectId(payload.supplier._id as any);
      }

      await Expense.create([expenseData], { session });
    }

    await session.commitTransaction();
    await session.endSession();

    // Generate PDF invoice (optional - can be done asynchronously)
    try {
      const invoiceDir = path.join(__dirname, '../../../invoices');
      fs.mkdirSync(invoiceDir, { recursive: true });
      const invoicePath = path.join(invoiceDir, `purchase_${purchase.purchaseNumber}.pdf`);
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(invoicePath));

      // Add content to PDF
      doc.fontSize(25).text('Purchase Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).text(`Purchase Number: ${purchase.purchaseNumber}`);
      doc.text(`Date: ${new Date().toLocaleDateString()}`);
      doc.text(`Supplier: ${purchase.supplier.name}`);
      if (purchase.supplier.contactPerson) doc.text(`Contact Person: ${purchase.supplier.contactPerson}`);
      if (purchase.supplier.phone) doc.text(`Phone: ${purchase.supplier.phone}`);
      if (purchase.supplier.email) doc.text(`Email: ${purchase.supplier.email}`);
      if (purchase.supplier.address) doc.text(`Address: ${purchase.supplier.address}`);
      doc.moveDown();
      doc.text('Items:');
      purchase.items.forEach((item: TPurchaseItem) => {
        doc.text(`${item.productName} - Qty: ${item.quantity} - Price: ৳${item.unitPrice} - Total: ৳${item.totalPrice}`);
      });
      doc.moveDown();
      doc.text(`Subtotal: ৳${purchase.subtotal}`);
      doc.text(`Discount: ৳${purchase.discount || 0}`);
      doc.text(`Tax: ৳${purchase.tax || 0}`);
      doc.text(`Additional Charges: ৳${purchase.additionalCharges || 0}`);
      doc.text(`Grand Total: ৳${purchase.totalAmount}`);
      doc.end();
    } catch (pdfError) {
      console.error('PDF generation error:', pdfError);
      // Don't fail the purchase creation if PDF fails
    }

    return purchase;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

const getAllPurchases = async (query: Record<string, unknown>) => {
  // Handle date filtering
  const dateFilter: Record<string, unknown> = { isDeleted: false };

  if (query.date) {
    const dateStr = query.date as string;
    // Parse date string (YYYY-MM-DD) and create date range in local timezone
    const [year, month, day] = dateStr.split('-').map(Number);

    // Create start of day in local timezone
    const startOfDay = new Date(year, month - 1, day, 0, 0, 0, 0);

    // Create end of day in local timezone
    const endOfDay = new Date(year, month - 1, day, 23, 59, 59, 999);

    dateFilter.createdAt = {
      $gte: startOfDay,
      $lte: endOfDay,
    };
  }

  // Remove date from query before passing to QueryBuilder to avoid conflicts
  const queryWithoutDate = { ...query };
  delete queryWithoutDate.date;

  const purchaseQuery = new QueryBuilder(
    Purchase.find(dateFilter)
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
    .search(["purchaseNumber", "supplier.name", "supplier.phone"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await purchaseQuery.modelQuery;
  const total = await purchaseQuery.countTotal();
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

const getPurchaseById = async (id: string) => {
  const result = await Purchase.findById(id)
    .populate("createdBy", "name email")
    .populate("items.product");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");
  }

  // Debug: Log retrieved purchase
  console.log('Retrieved purchase:', JSON.stringify(result.toObject(), null, 2));

  return result;
};

const updatePurchase = async (id: string, payload: Partial<TPurchase>) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const existing = await Purchase.findById(id).session(session);
    if (!existing) {
      throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");
    }

    // Adjust product stock and prices when items are updated
    if (payload.items && payload.items.length > 0) {
      for (const newItem of payload.items) {
        const oldItem = existing.items.find(
          (i) => String(i.product) === String(newItem.product)
        );

        const oldQty = oldItem?.quantity ?? 0;
        const qtyDelta = newItem.quantity - oldQty;

        const productUpdate: any = {
          $set: { purchasePrice: newItem.unitPrice },
        };
        if (qtyDelta !== 0) {
          productUpdate.$inc = { stockQuantity: qtyDelta };
        }
        if (newItem.sellingPrice !== undefined && newItem.sellingPrice !== null) {
          productUpdate.$set.sellingPrice = newItem.sellingPrice;
        }

        await Product.findByIdAndUpdate(newItem.product, productUpdate, {
          session,
          new: true,
        });
      }
    }

    // Update the linked expense (transaction) amount when totalAmount changes
    if (payload.totalAmount !== undefined) {
      await Expense.findOneAndUpdate(
        { referenceId: existing._id, referenceModel: "Purchase" },
        {
          amount: payload.totalAmount,
          description: `Purchase of ${(payload.items ?? existing.items).length} product(s) from ${payload.supplier?.name ?? existing.supplier.name}`,
        },
        { session }
      );
    }

    const result = await Purchase.findByIdAndUpdate(id, payload, {
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

const deletePurchase = async (id: string) => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const purchase = await Purchase.findById(id).session(session);

    if (!purchase) {
      throw new AppError(httpStatus.NOT_FOUND, "Purchase not found");
    }

    if (purchase.status === "completed" || purchase.status === "partial") {
      throw new AppError(httpStatus.BAD_REQUEST, "Cannot delete completed or partial purchase");
    }

    // Restore stock when deleting purchase (since stock was added on creation)
    for (const item of purchase.items) {
      await Product.findByIdAndUpdate(
        item.product,
        { $inc: { stockQuantity: -item.quantity } },
        { session, new: true }
      );
    }

    // Delete associated expense
    await Expense.deleteMany(
      { 
        referenceId: purchase._id,
        referenceModel: 'Purchase'
      },
      { session }
    );

    const result = await Purchase.findByIdAndUpdate(
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

const getSupplierBalance = async (supplierId: string) => {
  const purchases = await Purchase.find({ 'supplier._id': supplierId, isDeleted: false });
  const balance = purchases.reduce(
    (sum, p) => sum + p.totalAmount - (p.paidAmount ?? 0),
    0
  );
  return { balance };
};

export const PurchaseServices = {
  createPurchase,
  getAllPurchases,
  getPurchaseById,
  updatePurchase,
  deletePurchase,
  getSupplierBalance,
};

