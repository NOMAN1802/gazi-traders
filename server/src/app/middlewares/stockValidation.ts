import { Request, Response, NextFunction } from 'express';
import AppError from '../errors/AppError';
import { Product } from '../modules/Product/product.model';
import httpStatus from 'http-status';


export const validateStock = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { items } = req.body;

        if (!items || !Array.isArray(items)) {
            return next(new AppError(httpStatus.BAD_REQUEST, 'Order items are required'));
        }

        // Check stock availability for all items
        for (const item of items) {
            if (!item.product || !item.quantity || item.quantity <= 0) {
                return next(new AppError(httpStatus.BAD_REQUEST, 'Invalid item data'));
            }

            const product = await Product.findOne({
                _id: item.product,
                isDeleted: false,
            });

            if (!product) {
                return next(new AppError(
                    httpStatus.NOT_FOUND,
                    `Product not found: ${item.productName || item.product}`
                ));
            }

            if (product.stockQuantity < item.quantity) {
                return next(new AppError(
                    httpStatus.BAD_REQUEST,
                    `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`
                ));
            }
        }

        next();
    } catch (error) {
        next(error);
    }
};

export const checkLowStock = async (productId: string): Promise<{
    isLowStock: boolean;
    currentStock: number;
    minStockLevel: number;
}> => {
    const product = await Product.findById(productId);

    if (!product) {
        throw new AppError(httpStatus.NOT_FOUND, 'Product not found');
    }

    const minStock = product.minStockLevel || 10;
    const isLowStock = product.stockQuantity <= minStock;

    return {
        isLowStock,
        currentStock: product.stockQuantity,
        minStockLevel: minStock,
    };
};

export const getStockSummary = async () => {
    const [totalProducts, lowStockProducts, outOfStockProducts] = await Promise.all([
        Product.countDocuments({ isDeleted: false }),
        Product.countDocuments({
            isDeleted: false,
            $expr: { $lte: ['$stockQuantity', '$minStockLevel'] }
        }),
        Product.countDocuments({
            isDeleted: false,
            stockQuantity: 0
        })
    ]);

    return {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        healthyStockProducts: totalProducts - lowStockProducts - outOfStockProducts,
    };
};
