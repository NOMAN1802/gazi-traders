import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    ArrowLeftIcon,
    ShoppingBagIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useCreateProductMutation } from '@/services/productsApi';

type ProductFormData = {
    name: string;
    sku: string;
    category: string;
    unit: 'pcs' | 'box' | 'kg' | 'litre' | 'pack';
    description: string;
};

const CreateProductPage = () => {
    const navigate = useNavigate();
    const [createProduct, { isLoading }] = useCreateProductMutation();
    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        category: '',
        unit: 'pcs',
        description: '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});

    const handleChange = (field: keyof ProductFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof ProductFormData, string>> = {};

        if (!formData.name.trim()) newErrors.name = 'Product name is required';
        if (!formData.unit.trim()) newErrors.unit = 'Unit is required';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) return;

        try {
            await createProduct({
                name: formData.name,
                sku: formData.sku || undefined,
                categoryName: formData.category || undefined,
                unit: formData.unit,
                purchasePrice: 0,
                sellingPrice: 0,
                stockQuantity: 0,
                description: formData.description || undefined,
            }).unwrap();

            // Success! Navigate back to products page
            navigate('/products');
        } catch (error) {
            console.error('Failed to create product:', error);
            // You can add toast notification here
        }
    };

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
                        <h1 className="mt-2 text-3xl font-bold text-slate-900">Create New Product</h1>
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
                                        <input
                                            type="text"
                                            value={formData.category}
                                            onChange={(e) => handleChange('category', e.target.value)}
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                            placeholder="e.g., Electronics"
                                        />
                                    </div>
                                </div>

                                {/* Unit */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                                        Unit <span className="text-danger">*</span>
                                    </label>
                                    <select
                                        value={formData.unit}
                                        onChange={(e) => handleChange('unit', e.target.value)}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                    >
                                        <option value="pcs">Pieces (pcs)</option>
                                        <option value="box">Box</option>
                                        <option value="kg">Kilogram (kg)</option>
                                        <option value="litre">Litre</option>
                                        <option value="pack">Pack</option>
                                    </select>
                                </div>

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
                                {isLoading ? 'Creating...' : 'Create Product'}
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

export default CreateProductPage;

