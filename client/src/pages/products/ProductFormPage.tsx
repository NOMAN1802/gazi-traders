import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeftIcon,
    ShoppingBagIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useCreateProductMutation, useUpdateProductMutation, useGetProductQuery } from '@/services/productsApi';
import { useGetCategoriesQuery } from '@/services/categoriesApi';
import { useGetUnitsQuery } from '@/services/unitsApi';
import { useGetSuppliersQuery, type Supplier } from '@/services/suppliersApi';
import Loader from '@/components/common/Loader';

type ProductFormData = {
    name: string;
    sku: string;
    category: string;
    unit: string;
    supplier: string;
    description: string;
};

const ProductFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

    // Fetch product data if in edit mode
    const { data: product, isLoading: isFetchingProduct } = useGetProductQuery(
        id!,
        { skip: !isEditMode }
    );

    // Fetch categories, units, and suppliers
    const { data: categoriesData } = useGetCategoriesQuery({ limit: 100 });
    const { data: unitsData } = useGetUnitsQuery({ limit: 100 });
    const { data: suppliersData } = useGetSuppliersQuery({ limit: 100 });

    const categories = categoriesData?.categories ?? [];
    const units = unitsData?.units ?? [];
    const suppliers = suppliersData?.suppliers ?? [];

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        category: '',
        unit: '',
        supplier: '',
        description: '',
    });

    const [purchasePrice, setPurchasePrice] = useState('');
    const [markupPercent, setMarkupPercent] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');

    const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
    const prevProductIdRef = useRef<string | undefined>(undefined);

    // Populate form data when editing (only when product ID changes to avoid cascading renders)
    useEffect(() => {
        if (!isEditMode || !product) return;

        // Only update if this is a new product (product ID changed) or first load
        if (prevProductIdRef.current !== product._id) {
            prevProductIdRef.current = product._id;
            queueMicrotask(() => {
                setFormData({
                    name: product.name,
                    sku: product.sku || '',
                    category: product.categoryName || '',
                    unit: product.unit,
                    supplier: product.supplierId || '',
                    description: product.description || '',
                });
                const pp = product.purchasePrice ?? 0;
                const sp = product.sellingPrice ?? 0;
                setPurchasePrice(pp ? String(pp) : '');
                setSellingPrice(sp ? String(sp) : '');
                setMarkupPercent(pp > 0 ? ((sp / pp - 1) * 100).toFixed(2) : '');
            });
        }
    }, [isEditMode, product]);

    const handleChange = (field: keyof ProductFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const handlePurchasePriceChange = (val: string) => {
        setPurchasePrice(val);
        const pp = parseFloat(val);
        const mu = parseFloat(markupPercent);
        if (!isNaN(pp) && !isNaN(mu)) {
            setSellingPrice((pp * (1 + mu / 100)).toFixed(2));
        }
    };

    const handleMarkupChange = (val: string) => {
        setMarkupPercent(val);
        const pp = parseFloat(purchasePrice);
        const mu = parseFloat(val);
        if (!isNaN(pp) && !isNaN(mu)) {
            setSellingPrice((pp * (1 + mu / 100)).toFixed(2));
        }
    };

    const handleSellingPriceChange = (val: string) => {
        setSellingPrice(val);
        const pp = parseFloat(purchasePrice);
        const sp = parseFloat(val);
        if (!isNaN(pp) && pp > 0 && !isNaN(sp)) {
            setMarkupPercent(((sp / pp - 1) * 100).toFixed(2));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

        if (!formData.name.trim()) newErrors.name = 'Product name is required';

        // Only validate unit in create mode
        if (!isEditMode) {
            if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            if (isEditMode && id) {
                const updatePayload = {
                    name: formData.name,
                    sku: formData.sku || undefined,
                    categoryName: formData.category || undefined,
                    unit: formData.unit || undefined,
                    supplierId: formData.supplier || undefined,
                    purchasePrice: purchasePrice !== '' ? parseFloat(purchasePrice) : undefined,
                    sellingPrice: sellingPrice !== '' ? parseFloat(sellingPrice) : undefined,
                    description: formData.description || undefined,
                };
                await updateProduct({ id, data: updatePayload }).unwrap();
            } else {
                // In create mode, send only basic info (no pricing/inventory)
                const createPayload = {
                    name: formData.name,
                    sku: formData.sku || undefined,
                    categoryName: formData.category || undefined,
                    unit: formData.unit,
                    purchasePrice: 0,
                    sellingPrice: 0,
                    stockQuantity: 0,
                    supplierId: formData.supplier || undefined,
                    description: formData.description || undefined,
                };
                await createProduct(createPayload).unwrap();
            }

            // Success! Navigate back to products page
            navigate('/products');
        } catch (error) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} product:`, error);
            // You can add toast notification here
        }
    };

    if (isEditMode && isFetchingProduct) {
        return <Loader fullScreen message="Loading product..." />;
    }

    const isLoading = isCreating || isUpdating;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/products')}
                        className="flex h-10 w-10 items-center justify-center rounded-sm text-slate-600 hover:bg-slate-100 transition-colors"
                    >
                        <ArrowLeftIcon className="h-5 w-5" />
                    </button>
                    <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-brand">Inventory &amp; Orders</p>
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">
                            {isEditMode ? 'Edit Product' : 'Create New Product'}
                        </h1>
                    </div>
                </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Form - Takes 2 columns */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Basic Information */}
                        <section className="rounded-sm border border-slate-200/60 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingBagIcon className="h-5 w-5 text-brand" />
                                <h2 className="text-lg font-bold text-slate-900">Basic Information</h2>
                            </div>

                            <div className="space-y-4">
                                {/* Product Name */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Product Name <span className="text-danger">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => handleChange('name', e.target.value)}
                                        className={`w-full rounded-sm border ${errors.name ? 'border-danger' : 'border-slate-200'
                                            } bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all`}
                                        placeholder="Enter product name"
                                    />
                                    {errors.name && (
                                        <p className="mt-1 text-xs text-danger">{errors.name}</p>
                                    )}
                                </div>

                                {/* SKU & Category */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            SKU Code
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={(e) => handleChange('sku', e.target.value)}
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                            placeholder="e.g., PRD-001"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Category
                                        </label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => handleChange('category', e.target.value)}
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map((category) => (
                                                <option key={category._id} value={category.name}>
                                                    {category.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Unit & Supplier */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Unit <span className="text-danger">*</span>
                                        </label>
                                        <select
                                            value={formData.unit}
                                            onChange={(e) => handleChange('unit', e.target.value)}
                                            className={`w-full rounded-sm border ${errors.unit ? 'border-danger' : 'border-slate-200'} bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all`}
                                        >
                                            <option value="">Select a unit</option>
                                            {units.map((unit) => (
                                                <option key={unit._id} value={unit.abbreviation}>
                                                    {unit.name} ({unit.abbreviation})
                                                </option>
                                            ))}
                                        </select>
                                        {errors.unit && (
                                            <p className="mt-1 text-xs text-danger">{errors.unit}</p>
                                        )}
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Supplier
                                        </label>
                                        <select
                                            value={formData.supplier}
                                            onChange={(e) => handleChange('supplier', e.target.value)}
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                        >
                                            <option value="">Select a supplier</option>
                                            {suppliers.filter((s: Supplier) => s.status === 'active').map((supplier: Supplier) => (
                                                <option key={supplier._id} value={supplier._id}>
                                                    {supplier.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Pricing — edit mode only */}
                                {isEditMode && (
                                    <div className="grid gap-4 sm:grid-cols-3">
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Purchase Price
                                            </label>
                                            <input
                                                type="number"
                                                value={purchasePrice}
                                                onChange={(e) => handlePurchasePriceChange(e.target.value)}
                                                min="0"
                                                step="0.01"
                                                className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Markup %
                                            </label>
                                            <input
                                                type="number"
                                                value={markupPercent}
                                                onChange={(e) => handleMarkupChange(e.target.value)}
                                                min="0"
                                                step="0.01"
                                                className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-green-700 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-slate-700 mb-2">
                                                Selling Price
                                            </label>
                                            <input
                                                type="number"
                                                value={sellingPrice}
                                                onChange={(e) => handleSellingPriceChange(e.target.value)}
                                                min="0"
                                                step="0.01"
                                                className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-brand placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        rows={4}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                                        placeholder="Enter product description..."
                                    />
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* Sidebar - Takes 1 column */}
                    <div className="space-y-6">
                        {/* Info Card */}
                        <div className="rounded-sm border border-brand/20 bg-brand/5 p-5">
                            <div className="flex items-start gap-3">
                                <InformationCircleIcon className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Quick Tips</h3>
                                    <ul className="space-y-2 text-xs text-slate-600">
                                        <li>• Use unique SKU codes for easy tracking</li>
                                        <li>• Add pricing and inventory when you purchase the product</li>
                                        <li>• Add detailed descriptions for clarity</li>
                                        <li>• Go to Purchase Product to add stock and pricing</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="rounded-sm border border-slate-200/60 bg-white p-5 shadow-sm space-y-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full rounded-sm bg-linear-to-r from-brand to-brand-dark px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-brand/40 transition-all duration-200 hover:shadow-xl hover:shadow-brand/50 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (isEditMode ? 'Updating...' : 'Creating...') : (isEditMode ? 'Update Product' : 'Create Product')}
                            </button>
                            <button
                                type="button"
                                onClick={() => navigate('/products')}
                                className="w-full rounded-sm border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98]"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default ProductFormPage;

