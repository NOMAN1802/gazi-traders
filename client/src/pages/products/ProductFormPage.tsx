import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
    ArrowLeftIcon,
    ShoppingBagIcon,
    InformationCircleIcon
} from '@heroicons/react/24/outline';
import { useCreateProductMutation, useUpdateProductMutation, useGetProductQuery } from '@/services/productsApi';
import { useGetCategoriesQuery } from '@/services/categoriesApi';
import { useGetSuppliersQuery, type Supplier } from '@/services/suppliersApi';
import Loader from '@/components/common/Loader';

type UnitType = 'Dozen' | 'Cartoon' | '';

type ProductFormData = {
    name: string;
    sku: string;
    category: string;
    unit: UnitType;
    supplier: string;
    sellingPrice: string;
    description: string;
};

const ProductFormPage = () => {
    const navigate = useNavigate();
    const { id } = useParams<{ id: string }>();
    const isEditMode = !!id;

    const [createProduct, { isLoading: isCreating }] = useCreateProductMutation();
    const [updateProduct, { isLoading: isUpdating }] = useUpdateProductMutation();

    const { data: product, isLoading: isFetchingProduct } = useGetProductQuery(id!, { skip: !isEditMode });
    const { data: categoriesData } = useGetCategoriesQuery({ limit: 100 });
    const { data: suppliersData } = useGetSuppliersQuery({ limit: 100 });

    const categories = categoriesData?.categories ?? [];
    const suppliers = suppliersData?.suppliers ?? [];

    const [formData, setFormData] = useState<ProductFormData>({
        name: '',
        sku: '',
        category: '',
        unit: '',
        supplier: '',
        sellingPrice: '',
        description: '',
    });

    const [errors, setErrors] = useState<Partial<Record<keyof ProductFormData, string>>>({});
    const prevProductIdRef = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (!isEditMode || !product) return;
        if (prevProductIdRef.current !== product._id) {
            prevProductIdRef.current = product._id;
            queueMicrotask(() => {
                setFormData({
                    name: product.name,
                    sku: product.sku || '',
                    category: product.categoryName || '',
                    unit: (product.unit === 'Dozen' || product.unit === 'Cartoon') ? product.unit : '',
                    supplier: product.supplierId || '',
                    sellingPrice: product.sellingPrice ? String(product.sellingPrice) : '',
                    description: product.description || '',
                });
            });
        }
    }, [isEditMode, product]);

    const handleChange = (field: keyof ProductFormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validate = (): boolean => {
        const newErrors: Partial<Record<keyof ProductFormData, string>> = {};
        if (!formData.name.trim()) newErrors.name = 'Product name is required';
        if (!formData.unit) newErrors.unit = 'Unit is required';
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;

        try {
            if (isEditMode && id) {
                await updateProduct({
                    id,
                    data: {
                        name: formData.name,
                        sku: formData.sku || undefined,
                        categoryName: formData.category || undefined,
                        unit: formData.unit as 'Dozen' | 'Cartoon',
                        supplierId: formData.supplier || undefined,
                        sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : 0,
                        description: formData.description || undefined,
                    },
                }).unwrap();
            } else {
                await createProduct({
                    name: formData.name,
                    sku: formData.sku || undefined,
                    categoryName: formData.category || undefined,
                    unit: formData.unit as 'Dozen' | 'Cartoon',
                    sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : 0,
                    stockQuantity: 0,
                    supplierId: formData.supplier || undefined,
                    description: formData.description || undefined,
                }).unwrap();
            }
            navigate('/products');
        } catch (error) {
            console.error(`Failed to ${isEditMode ? 'update' : 'create'} product:`, error);
        }
    };

    if (isEditMode && isFetchingProduct) {
        return <Loader fullScreen message="Loading product..." />;
    }

    const isLoading = isCreating || isUpdating;

    return (
        <div className="space-y-6">
            {/* Header */}
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

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main Form */}
                    <div className="lg:col-span-2 space-y-6">
                        <section className="rounded-sm border border-slate-200/60 bg-white p-6 shadow-sm">
                            <div className="flex items-center gap-2 mb-6">
                                <ShoppingBagIcon className="h-5 w-5 text-brand" />
                                <h2 className="text-lg font-bold text-slate-900">Product Information</h2>
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
                                        className={`w-full rounded-sm border ${errors.name ? 'border-danger' : 'border-slate-200'} bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all`}
                                        placeholder="Enter product name"
                                    />
                                    {errors.name && <p className="mt-1 text-xs text-danger">{errors.name}</p>}
                                </div>

                                {/* SKU & Category */}
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">SKU Code</label>
                                        <input
                                            type="text"
                                            value={formData.sku}
                                            onChange={(e) => handleChange('sku', e.target.value)}
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                            placeholder="e.g., PRD-001"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">Category</label>
                                        <select
                                            value={formData.category}
                                            onChange={(e) => handleChange('category', e.target.value)}
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                        >
                                            <option value="">Select a category</option>
                                            {categories.map((cat) => (
                                                <option key={cat._id} value={cat.name}>{cat.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Unit & Rate */}
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
                                            <option value="">Select unit type</option>
                                            <option value="Dozen">Dozen (1 Dozen = 12 pcs)</option>
                                            <option value="Cartoon">Cartoon</option>
                                        </select>
                                        {errors.unit && <p className="mt-1 text-xs text-danger">{errors.unit}</p>}
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                                            Rate (per piece)
                                        </label>
                                        <input
                                            type="number"
                                            value={formData.sellingPrice}
                                            onChange={(e) => handleChange('sellingPrice', e.target.value)}
                                            min="0"
                                            step="0.01"
                                            className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                {/* Supplier */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Supplier</label>
                                    <select
                                        value={formData.supplier}
                                        onChange={(e) => handleChange('supplier', e.target.value)}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all"
                                    >
                                        <option value="">Select a supplier</option>
                                        {suppliers.filter((s: Supplier) => s.status === 'active').map((s: Supplier) => (
                                            <option key={s._id} value={s._id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-2">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => handleChange('description', e.target.value)}
                                        rows={3}
                                        className="w-full rounded-sm border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-brand focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand/20 transition-all resize-none"
                                        placeholder="Enter product description..."
                                    />
                                </div>
                            </div>
                        </section>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Info Card */}
                        <div className="rounded-sm border border-brand/20 bg-brand/5 p-5">
                            <div className="flex items-start gap-3">
                                <InformationCircleIcon className="h-5 w-5 text-brand mt-0.5 shrink-0" />
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 mb-2">Quick Tips</h3>
                                    <ul className="space-y-2 text-xs text-slate-600">
                                        <li><strong>Dozen:</strong> 1 Dozen = 12 pieces</li>
                                        <li><strong>Cartoon:</strong> Pieces per cartoon set during Purchase</li>
                                        <li>Rate is the selling price per piece</li>
                                        <li>Cartoon size &amp; stock quantity are managed in Purchase</li>
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
