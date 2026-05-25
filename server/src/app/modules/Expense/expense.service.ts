import httpStatus from "http-status";
import mongoose from "mongoose";
import { QueryBuilder } from "../../builder/QueryBuilder";
import AppError from "../../errors/AppError";
import { TExpense } from "./expense.interface";
import { Expense } from "./expense.model";

const createExpense = async (payload: TExpense, userId: string) => {
  payload.createdBy = new mongoose.Types.ObjectId(userId);
  const result = await Expense.create(payload);
  return result;
};

const getAllExpenses = async (query: Record<string, unknown>) => {
  // Handle date filtering
  const dateFilter: Record<string, unknown> = {};

  if (query.startDate || query.endDate) {
    const dateRange: Record<string, unknown> = {};
    if (query.startDate) {
      dateRange.$gte = new Date(query.startDate as string);
    }
    if (query.endDate) {
      dateRange.$lte = new Date(query.endDate as string);
    }
    dateFilter.date = dateRange;
  }

  // Remove date params from query before passing to QueryBuilder
  const queryWithoutDate: Record<string, unknown> = { ...query };
  delete queryWithoutDate.startDate;
  delete queryWithoutDate.endDate;

  const expenseQuery = new QueryBuilder(
    Expense.find(dateFilter)
      .populate("createdBy", "name email")
      .populate("supplier", "name phone email"),
    queryWithoutDate
  )
    .search(["title", "category"])
    .filter()
    .sort()
    .paginate()
    .fields();

  const result = await expenseQuery.modelQuery;
  const total = await expenseQuery.countTotal();
  const { page = 1, limit = 10 } = query;

  // Populate product information for expenses with referenceModel = "Product"
  const expensesWithProduct = await Promise.all(
    result.map(async (expense: any) => {
      const expenseObj = expense.toObject ? expense.toObject() : expense;

      if (expenseObj.referenceModel === "Product" && expenseObj.referenceId) {
        const Product = (await import("../Product/product.model")).Product;
        const product = await Product.findById(expenseObj.referenceId).select("categoryName purchasePrice stockQuantity name unit");
        if (product) {
          const productObj = product.toObject();

          // Extract purchase quantity from description
          // Format: "Initial purchase of X unit(s)" or "Added X unit(s) to existing stock" or "Stock Addition: Product Name"
          let purchaseQuantity = 0;
          if (expenseObj.description) {
            // Try to match patterns like "Initial purchase of 10 pcs(s)" or "Added 5 kg(s)"
            const quantityMatch = expenseObj.description.match(/(?:Initial purchase of|Added)\s+(\d+)\s+(\w+)/i);
            if (quantityMatch) {
              purchaseQuantity = Number(quantityMatch[1]);
            } else {
              // Fallback: try to find any number followed by unit
              const fallbackMatch = expenseObj.description.match(/(\d+)\s+(\w+)/i);
              if (fallbackMatch) {
                purchaseQuantity = Number(fallbackMatch[1]);
              }
            }
          }

          // If still 0, calculate from amount and purchase price (use current product price as fallback)
          if (purchaseQuantity === 0) {
            const purchasePrice = productObj.purchasePrice || 0;
            if (purchasePrice > 0 && expenseObj.amount) {
              purchaseQuantity = Math.round(expenseObj.amount / purchasePrice);
            }
          }

          expenseObj.referenceId = {
            ...productObj,
            quantity: purchaseQuantity, // Purchase quantity for this specific transaction
            purchasePrice: productObj.purchasePrice,
          };
        }
      }

      return expenseObj;
    })
  );

  return {
    meta: {
      total,
      page: Number(page),
      limit: Number(limit),
    },
    result: expensesWithProduct,
  };
};

const getExpenseById = async (id: string) => {
  const result = await Expense.findById(id).populate("createdBy", "name email");

  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "Expense not found");
  }

  return result;
};

const updateExpense = async (id: string, payload: Partial<TExpense>) => {
  const expense = await Expense.findById(id);

  if (!expense) {
    throw new AppError(httpStatus.NOT_FOUND, "Expense not found");
  }

  const result = await Expense.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  return result;
};

const deleteExpense = async (id: string) => {
  const expense = await Expense.findById(id);

  if (!expense) {
    throw new AppError(httpStatus.NOT_FOUND, "Expense not found");
  }

  const result = await Expense.findByIdAndDelete(id);
  return result;
};

const getExpenseSummary = async (startDate?: Date, endDate?: Date) => {
  const matchStage: Record<string, any> = {};

  if (startDate || endDate) {
    matchStage.date = {};
    if (startDate) (matchStage.date as any).$gte = startDate;
    if (endDate) (matchStage.date as any).$lte = endDate;
  }

  const summary = await Expense.aggregate([
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: "$category",
        totalAmount: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { totalAmount: -1 },
    },
  ]);

  const totalExpenses = await Expense.aggregate([
    ...(Object.keys(matchStage).length > 0 ? [{ $match: matchStage }] : []),
    {
      $group: {
        _id: null,
        total: { $sum: "$amount" },
        count: { $sum: 1 },
      },
    },
  ]);

  return {
    byCategory: summary,
    total: totalExpenses[0] || { total: 0, count: 0 },
  };
};

export const ExpenseServices = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpenseSummary,
};
