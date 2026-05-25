/* eslint-disable @typescript-eslint/no-unused-vars */

import httpStatus from 'http-status';
import mongoose from 'mongoose';
import AppError from '../../errors/AppError';
import { TProduct } from './product.interface';
import { Product } from './product.model';
import { Category } from '../Category/category.model';
import { Expense } from '../Expense/expense.model';

const findExistingProduct = async (name: string, sku?: string, session?: mongoose.ClientSession): Promise<TProduct | null> => {
  const filter: Record<string, unknown> = {
    name: name.trim(),
    isDeleted: false
  };

  // If SKU is provided, also check by SKU
  if (sku) {
    const query = Product.findOne({
      $or: [
        { name: name.trim(), isDeleted: false },
        { sku: sku.trim(), isDeleted: false }
      ]
    });

    if (session) {
      query.session(session);
    }

    return await query;
  }

  const query = Product.findOne(filter);
  if (session) {
    query.session(session);
  }

  return await query;
};

const resolveCategory = async (categoryId?: string) => {
  if (!categoryId) {
    return null;
  }

  const category = await Category.findOne({
    _id: categoryId,
    isDeleted: false,
    isActive: true,
  });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, 'Category not found or inactive');
  }

  return category;
};

const createProduct = async (payload: TProduct): Promise<TProduct> => {
  const session = await mongoose.startSession();

  try {
    session.startTransaction();

    const category = await resolveCategory(payload.categoryId);
    const incomingQuantity = payload.stockQuantity ?? 0;
    const incomingPurchasePrice = payload.purchasePrice ?? 0;

    // Check if product already exists by name or SKU
    const existingProduct = await findExistingProduct(payload.name, payload.sku, session);

    let product: TProduct;
    let isNewProduct = false;

    if (existingProduct) {
      // Product exists - increment quantity instead of creating new
      const quantityToAdd = incomingQuantity;

      // Update existing product quantity
      product = await Product.findByIdAndUpdate(
        existingProduct._id,
        {
          $inc: { stockQuantity: quantityToAdd },
          $set: {
            // Update purchase price to the latest purchase price if provided
            ...(incomingPurchasePrice > 0 && { purchasePrice: incomingPurchasePrice }),
            // Update selling price if provided and different
            ...(payload.sellingPrice && { sellingPrice: payload.sellingPrice }),
          }
        },
        { new: true, session }
      ).populate('category') as TProduct;

      if (!product) {
        throw new AppError(httpStatus.INTERNAL_SERVER_ERROR, 'Failed to update product');
      }
    } else {
      // Product doesn't exist - create new product
      isNewProduct = true;

      const productData: any = {
        ...payload,
        stockQuantity: incomingQuantity ?? 0,
        minStockLevel: payload.minStockLevel ?? 0,
        // Set default values for pricing if not provided
        purchasePrice: payload.purchasePrice ?? 0,
        sellingPrice: payload.sellingPrice ?? 0,
      };

      if (category) {
        productData.category = category._id;
        productData.categoryName = category.name;
      }

      // Set supplierId if provided
      if (payload.supplierId && mongoose.Types.ObjectId.isValid(payload.supplierId)) {
        productData.supplierId = new mongoose.Types.ObjectId(payload.supplierId);
      }

      // Create new product
      const [created] = await Product.create([productData], { session });
      product = category ? await created.populate('category') : created;
    }

    // Automatically create expense/transaction for product purchase
    // Only create expense if quantity > 0 and purchase price > 0
    if (incomingQuantity > 0 && incomingPurchasePrice > 0 && payload.createdBy) {
      const expenseAmount = incomingPurchasePrice * incomingQuantity;

      const expenseData: any = {
        title: isNewProduct
          ? `Purchase: ${payload.name}`
          : `Stock Addition: ${payload.name}`,
        category: 'product_purchase',
        amount: expenseAmount,
        date: new Date(),
        referenceId: product._id,
        referenceModel: 'Product',
        createdBy: payload.createdBy,
        description: isNewProduct
          ? `Initial purchase of ${incomingQuantity} ${payload.unit}(s)`
          : `Added ${incomingQuantity} ${payload.unit}(s) to existing stock`,
      };

      // Add supplier if provided
      if (payload.supplierId && mongoose.Types.ObjectId.isValid(payload.supplierId)) {
        expenseData.supplier = new mongoose.Types.ObjectId(payload.supplierId);
      }

      await Expense.create([expenseData], { session });
    }

    await session.commitTransaction();
    await session.endSession();

    return product;
  } catch (error) {
    await session.abortTransaction();
    await session.endSession();
    throw error;
  }
};

const getProduct = async (id: string): Promise<TProduct | null> => {
  const result = await Product.findOne({ _id: id, isDeleted: false }).populate(
    'category'
  );

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return result;
};

const getProducts = async (
  query: Record<string, unknown>
): Promise<{ products: TProduct[]; total: number; page: number; limit: number }> => {
  const { page = 1, limit = 10 } = query;

  // Build the base filter
  const baseFilter: any = { isDeleted: false };

  // Build category filter
  let categoryFilter: any = null;
  if (query.categoryId) {
    const categoryId = query.categoryId as string;
    if (mongoose.Types.ObjectId.isValid(categoryId)) {
      // Get the category to filter by both category (ObjectId) and categoryName (string)
      // This handles cases where products might have categoryName but not category ObjectId
      const category = await Category.findById(categoryId);
      if (category) {
        // Filter by both category ObjectId and categoryName to handle all cases
        categoryFilter = {
          $or: [
            { category: new mongoose.Types.ObjectId(categoryId) },
            { categoryName: category.name }
          ]
        };
      } else {
        // If category not found, just filter by ObjectId
        categoryFilter = { category: new mongoose.Types.ObjectId(categoryId) };
      }
    }
  }

  // Build search filter
  let searchFilter: any = null;
  if (query.search) {
    const searchTerm = query.search as string;
    searchFilter = {
      $or: [
        { name: new RegExp(searchTerm, 'i') },
        { sku: new RegExp(searchTerm, 'i') },
        { categoryName: new RegExp(searchTerm, 'i') },
      ],
    };
  }

  // Combine filters properly
  const finalFilter: any = { ...baseFilter };

  // If we have both category and search filters, use $and to combine them
  if (categoryFilter && searchFilter) {
    finalFilter.$and = [
      categoryFilter,
      searchFilter
    ];
  } else if (categoryFilter) {
    // Only category filter
    Object.assign(finalFilter, categoryFilter);
  } else if (searchFilter) {
    // Only search filter
    Object.assign(finalFilter, searchFilter);
  }

  // Calculate pagination
  const skip = (Number(page) - 1) * Number(limit);

  // Execute queries in parallel
  const [products, total] = await Promise.all([
    Product.find(finalFilter)
      .populate('category')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Product.countDocuments(finalFilter),
  ]);

  return {
    products,
    total,
    page: Number(page),
    limit: Number(limit),
  };
};

const updateProduct = async (
  id: string,
  payload: Partial<TProduct>
): Promise<TProduct | null> => {
  const product = await Product.findOne({ _id: id, isDeleted: false });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  const allowedFields = ['name', 'sku', 'categoryName', 'unit', 'supplierId', 'sellingPrice', 'description'];
  const updateData: any = {};

  for (const field of allowedFields) {
    if (field in payload && payload[field as keyof TProduct] !== undefined) {
      updateData[field] = payload[field as keyof TProduct];
    }
  }

  // When categoryName changes, also resolve and update the category ObjectId
  if (updateData.categoryName) {
    const category = await Category.findOne({ name: updateData.categoryName, isDeleted: false });
    if (category) {
      updateData.category = category._id;
    }
  }

  const result = await Product.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  ).populate('category');

  return result;
};

const deleteProduct = async (id: string): Promise<boolean> => {
  const product = await Product.findOneAndUpdate(
    { _id: id, isDeleted: false },
    { $set: { isDeleted: true } },
    { new: true }
  );

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
  }

  return true;
};

export const ProductServices = {
  createProduct,
  getProduct,
  getProducts,
  updateProduct,
  deleteProduct,
};
