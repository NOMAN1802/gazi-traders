import { Fragment, useState } from 'react';
import {
    BookOpenIcon,
    ChartBarIcon,
    ClipboardDocumentListIcon,
    Cog6ToothIcon,
    CreditCardIcon,
    HomeIcon,
    RectangleGroupIcon,
    ShoppingBagIcon,
    ShoppingCartIcon,
    UserGroupIcon,
    UserPlusIcon,
    XMarkIcon,
    ChevronLeftIcon,
    ChevronRightIcon,
    SparklesIcon,
    ChevronDownIcon,
    TagIcon,
    RectangleStackIcon,
    ShieldCheckIcon,
    CalendarDaysIcon,
    BuildingStorefrontIcon,
    BanknotesIcon,
    DocumentPlusIcon,
    ListBulletIcon,
} from '@heroicons/react/24/outline';
import { Dialog, Transition } from '@headlessui/react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAppSelector } from '@/hooks/store';
import gaziLogo from '@/assets/gaziLogo.svg';

type NavigationItem = {
    name: string;
    to: string;
    icon: React.ComponentType<{ className?: string }>;
    badge: string | null;
    hasDropdown?: boolean;
    subItems?: Array<{
        name: string;
        to: string;
        icon: React.ComponentType<{ className?: string }>;
    }>;
};

const getNavigation = (userRole?: string): NavigationItem[] => {
    const baseNavigation: NavigationItem[] = [
        { name: 'Dashboard', to: '/', icon: HomeIcon, badge: null },
        {
            name: 'Products',
            to: '/products',
            icon: ShoppingBagIcon,
            badge: null,
            hasDropdown: true,
            subItems: [
                { name: 'All Products', to: '/products', icon: ShoppingBagIcon },
                { name: 'Add Stock', to: '/stock-intake/add', icon: DocumentPlusIcon },
                { name: 'Stock Intake', to: '/stock-intake', icon: ClipboardDocumentListIcon },
                { name: 'Daily Stock', to: '/daily-stock', icon: CalendarDaysIcon },
                { name: 'Categories', to: '/categories', icon: TagIcon },
                { name: 'Units', to: '/units', icon: RectangleStackIcon },
                { name: 'Factories', to: '/suppliers', icon: BuildingStorefrontIcon },
            ]
        },
        {
            name: 'Sales',
            to: '/invoices',
            icon: CreditCardIcon,
            badge: '3',
            hasDropdown: true,
            subItems: [
                { name: 'All Sales', to: '/invoices', icon: CreditCardIcon },
                { name: "Today's Sales", to: '/orders/today', icon: CalendarDaysIcon },
            ]
        },
        {
            name: 'Distributors',
            to: '/customers',
            icon: UserGroupIcon,
            badge: null,
            hasDropdown: true,
            subItems: [
                { name: 'Create Distributor', to: '/customers/new', icon: UserPlusIcon },
                { name: 'Distributor List', to: '/customers', icon: UserGroupIcon },
                { name: 'Distributor Ledger', to: '/customers/ledger', icon: BookOpenIcon },
            ]
        },
        {
            name: 'Due Bill',
            to: '/due-bills',
            icon: BanknotesIcon,
            badge: null,
            hasDropdown: true,
            subItems: [
                { name: 'Due Bills', to: '/due-bills', icon: ListBulletIcon },
                { name: 'Add Due Bill', to: '/due-bills/add', icon: DocumentPlusIcon },
            ]
        },
        { name: 'Transactions', to: '/transactions', icon: ClipboardDocumentListIcon, badge: null },
    ];

    // Reports and User Management only for admin
    if (userRole === 'admin') {
        baseNavigation.push({
            name: 'Reports',
            to: '/reports',
            icon: ChartBarIcon,
            badge: null,
            hasDropdown: true,
            subItems: [
                { name: 'Overview', to: '/reports', icon: BanknotesIcon },
                { name: 'Daily Report', to: '/reports/daily', icon: CalendarDaysIcon },
                { name: 'Purchase Report', to: '/reports/purchase', icon: ShoppingCartIcon },
                { name: 'Sale Report', to: '/reports/sale', icon: CreditCardIcon },
                { name: 'Stock Report', to: '/reports/stock', icon: RectangleStackIcon },
            ]
        });
    }

    if (userRole === 'admin') {
        baseNavigation.push({
            name: 'User Management',
            to: '/users',
            icon: ShieldCheckIcon,
            badge: null
        });
    }

    return baseNavigation;
};

type SidebarProps = {
    open: boolean;
    onClose: () => void;
};

type SidebarContentProps = {
    collapsed?: boolean;
    isMobile?: boolean;
    onClose?: () => void;
};

const SidebarContent = ({ collapsed = false, isMobile = false, onClose }: SidebarContentProps) => {
    const location = useLocation();
    const user = useAppSelector((state) => state.auth.user);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const navigation = getNavigation(user?.role);

    const toggleDropdown = (itemName: string) => {
        setOpenDropdown(openDropdown === itemName ? null : itemName);
    };

    return (
        <nav className={`${isMobile ? 'mt-6' : 'mt-8'} space-y-1`}>
            {navigation.map((item) => {
                const hasDropdown = 'hasDropdown' in item && item.hasDropdown;
                const isDropdownOpen = openDropdown === item.name;
                const isParentActive = hasDropdown && item.subItems?.some(sub => location.pathname === sub.to);
                const isDirectActive = location.pathname === item.to;

                if (hasDropdown && !collapsed) {
                    return (
                        <div key={item.name}>
                            <button
                                onClick={() => toggleDropdown(item.name)}
                                className={`group relative flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${isParentActive || isDirectActive
                                    ? 'bg-linear-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/30'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-md'
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                                    {item.badge && (
                                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-sm bg-danger text-[10px] font-bold text-white ring-2 ring-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                <span className="flex-1 text-left">{item.name}</span>
                                <ChevronDownIcon
                                    className={`h-4 w-4 transition-transform duration-200 ${isDropdownOpen ? 'rotate-180' : ''}`}
                                />
                            </button>
                            {isDropdownOpen && (
                                <div className="ml-4 mt-1 space-y-1 border-l-2 border-slate-200 pl-4">
                                    {item.subItems?.map((subItem) => (
                                        <NavLink
                                            key={subItem.name}
                                            to={subItem.to}
                                            end
                                            onClick={isMobile ? onClose : undefined}
                                            className={({ isActive }) =>
                                                `group relative flex items-center gap-3 rounded-sm px-3 py-2 text-sm font-semibold transition-all duration-200 ${isActive
                                                    ? 'bg-brand/10 text-brand'
                                                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                }`
                                            }
                                        >
                                            <subItem.icon className="h-4 w-4" />
                                            <span>{subItem.name}</span>
                                        </NavLink>
                                    ))}
                                </div>
                            )}
                        </div>
                    );
                }

                // Collapsed state with dropdown
                if (hasDropdown && collapsed) {
                    return (
                        <div key={item.name} className="group relative">
                            <button
                                className={`flex w-full items-center justify-center rounded-sm px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${isParentActive || isDirectActive
                                    ? 'bg-linear-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/30'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-md'
                                    }`}
                            >
                                <div className="relative">
                                    <item.icon className="h-5 w-5 transition-transform duration-200 group-hover:scale-110" />
                                    {item.badge && (
                                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-sm bg-danger text-[10px] font-bold text-white ring-2 ring-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                            </button>
                            {/* Hover menu for dropdown items */}
                            <div className="pointer-events-none absolute left-full top-0 z-50 ml-3 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100">
                                <div className="relative rounded-sm bg-slate-900 py-2 shadow-2xl ring-1 ring-slate-800 min-w-[200px]">
                                    <div className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                                        {item.name}
                                    </div>
                                    <div className="py-1">
                                        {item.subItems?.map((subItem) => (
                                            <NavLink
                                                key={subItem.name}
                                                to={subItem.to}
                                                end
                                                onClick={isMobile ? onClose : undefined}
                                                className={({ isActive }) =>
                                                    `flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-all duration-150 ${isActive
                                                        ? 'bg-brand text-white'
                                                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                                                    }`
                                                }
                                            >
                                                <subItem.icon className="h-4 w-4 shrink-0" />
                                                <span>{subItem.name}</span>
                                            </NavLink>
                                        ))}
                                    </div>
                                    {/* Arrow pointer */}
                                    <div className="absolute right-full top-5 -mr-1">
                                        <div className="h-3 w-3 rotate-45 bg-slate-900 ring-1 ring-slate-800"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                }

                return (
                    <NavLink
                        key={item.name}
                        to={item.to}
                        onClick={isMobile ? onClose : undefined}
                        className={({ isActive }) =>
                            `group relative flex items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold transition-all duration-200 ${isActive
                                ? 'bg-linear-to-r from-brand to-brand-dark text-white shadow-lg shadow-brand/30'
                                : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-md'
                            } ${collapsed ? 'justify-center' : ''}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <div className={`relative ${collapsed ? '' : 'shrink-0'}`}>
                                    <item.icon
                                        className={`h-5 w-5 transition-transform duration-200 ${isActive ? '' : 'group-hover:scale-110'
                                            }`}
                                    />
                                    {item.badge && !collapsed && (
                                        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-sm bg-danger text-[10px] font-bold text-white ring-2 ring-white">
                                            {item.badge}
                                        </span>
                                    )}
                                </div>
                                {!collapsed && (
                                    <>
                                        <span className="flex-1">{item.name}</span>
                                        {isActive && <div className="h-1.5 w-1.5 rounded-sm bg-white"></div>}
                                    </>
                                )}
                                {collapsed && (
                                    <div className="absolute left-full ml-2 hidden group-hover:block z-50">
                                        <div className="rounded-sm bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl">
                                            {item.name}
                                            <div className="absolute right-full top-1/2 -translate-y-1/2">
                                                <div className="border-4 border-transparent border-r-slate-900"></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </NavLink>
                );
            })}
        </nav>
    );
};

const Sidebar = ({ open, onClose }: SidebarProps) => {
    const [collapsed, setCollapsed] = useState(false);
    const navigate = useNavigate();

    return (
        <>
            {/* Desktop Sidebar */}
            <div
                className={`hidden lg:flex lg:flex-col lg:border-r lg:border-slate-200/60 lg:bg-white/80 lg:backdrop-blur-xl lg:shadow-2xl lg:shadow-slate-900/5 lg:transition-all lg:duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-[292px]'
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo Section */}
                    <div className={`relative flex items-center gap-3 px-6 py-6 border-b border-slate-200/60 ${collapsed ? 'justify-center px-4' : ''}`}>
                        {!collapsed ? (
                            <>
                                <img
                                    src={gaziLogo}
                                    alt="Gazi Traders Logo"
                                    className="h-10 w-10 object-contain"
                                />
                                <div className="flex-1">
                                    <p className="text-lg font-bold text-slate-900">গাজী ট্রেডার্স</p>
                                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Inventory</p>
                                </div>
                            </>
                        ) : (
                            <img
                                src={gaziLogo}
                                alt="Gazi Traders Logo"
                                className="h-10 w-10 object-contain"
                            />
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex-1  px-4 py-2">
                        <SidebarContent collapsed={collapsed} />
                    </div>

                    {/* Upgrade Card */}
                    {!collapsed && (
                        <div className="mx-4 mb-4 overflow-hidden rounded-sm bg-linear-to-br from-brand-light via-purple-50 to-pink-50 p-5 shadow-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <SparklesIcon className="h-5 w-5 text-brand" />
                                <p className="text-sm font-bold text-slate-900">Upgrade to Premium</p>
                            </div>
                            <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                Unlock advanced analytics, AI forecasts & custom invoices.
                            </p>
                            <button className="mt-4 w-full rounded-sm bg-linear-to-r from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/40 transition-all duration-200 hover:shadow-xl hover:shadow-brand/50 hover:scale-[1.02] active:scale-[0.98]">
                                Upgrade Now
                            </button>
                        </div>
                    )}

                    {/* Settings & Collapse Button */}
                    <div className={`border-t border-slate-200/60 px-4 py-4 ${collapsed ? 'space-y-2' : 'flex items-center justify-between'}`}>
                        {!collapsed ? (
                            <>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="flex items-center gap-2 text-sm font-semibold text-slate-600 transition-all duration-200 hover:text-slate-900"
                                >
                                    <Cog6ToothIcon className="h-5 w-5" />
                                    <span>Settings</span>
                                </button>
                                <button
                                    onClick={() => setCollapsed(!collapsed)}
                                    className="flex items-center justify-center h-8 w-8 rounded-sm bg-slate-100 text-slate-600 transition-all duration-200 hover:bg-slate-200 hover:text-slate-900"
                                    title="Collapse sidebar"
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                </button>
                            </>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate('/settings')}
                                    className="flex items-center justify-center w-full h-10 rounded-sm text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
                                    title="Settings"
                                >
                                    <Cog6ToothIcon className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={() => setCollapsed(!collapsed)}
                                    className="flex items-center justify-center w-full h-10 rounded-sm bg-slate-100 text-slate-600 transition-all duration-200 hover:bg-slate-200 hover:text-slate-900"
                                    title="Expand sidebar"
                                >
                                    <ChevronRightIcon className="h-4 w-4" />
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Mobile Sidebar */}
            <Transition show={open} as={Fragment}>
                <Dialog as="div" className="relative z-50 lg:hidden" onClose={onClose}>
                    <Transition.Child
                        as={Fragment}
                        enter="transition-opacity ease-linear duration-300"
                        enterFrom="opacity-0"
                        enterTo="opacity-100"
                        leave="transition-opacity ease-linear duration-200"
                        leaveFrom="opacity-100"
                        leaveTo="opacity-0"
                    >
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
                    </Transition.Child>

                    <div className="fixed inset-0 flex">
                        <Transition.Child
                            as={Fragment}
                            enter="transition ease-out duration-300 transform"
                            enterFrom="-translate-x-full"
                            enterTo="translate-x-0"
                            leave="transition ease-in duration-200 transform"
                            leaveFrom="translate-x-0"
                            leaveTo="-translate-x-full"
                        >
                            <Dialog.Panel className="relative flex w-80 max-w-[85vw] flex-col bg-white shadow-2xl">
                                {/* Mobile Header */}
                                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-sm bg-linear-to-br from-brand to-brand-dark shadow-lg shadow-brand/30">
                                            <RectangleGroupIcon className="h-6 w-6 text-white" />
                                        </div>
                                        <div>
                                            <p className="text-lg font-bold text-slate-900">গাজী ট্রেডার্স</p>
                                            <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Inventory</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="flex h-9 w-9 items-center justify-center rounded-sm bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-900"
                                    >
                                        <XMarkIcon className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* Mobile Navigation */}
                                <div className="flex-1 overflow-y-auto px-4 py-2">
                                    <SidebarContent isMobile onClose={onClose} />
                                </div>

                                {/* Mobile Upgrade Card */}
                                <div className="mx-4 mb-4 overflow-hidden rounded-sm bg-linear-to-br from-brand-light via-purple-50 to-pink-50 p-5 shadow-lg">
                                    <div className="flex items-center gap-2 mb-2">
                                        <SparklesIcon className="h-5 w-5 text-brand" />
                                        <p className="text-sm font-bold text-slate-900">Upgrade to Premium</p>
                                    </div>
                                    <p className="mt-2 text-xs leading-relaxed text-slate-600">
                                        Unlock advanced analytics, AI forecasts & custom invoices.
                                    </p>
                                    <button className="mt-4 w-full rounded-sm bg-linear-to-r from-brand to-brand-dark px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-brand/40 transition-all duration-200 hover:shadow-xl hover:shadow-brand/50 active:scale-[0.98]">
                                        Upgrade Now
                                    </button>
                                </div>

                                {/* Mobile Settings */}
                                <div className="border-t border-slate-200 px-4 py-4">
                                    <button
                                        onClick={() => {
                                            navigate('/settings');
                                            onClose();
                                        }}
                                        className="flex w-full items-center gap-3 rounded-sm px-3 py-2.5 text-sm font-semibold text-slate-600 transition-all duration-200 hover:bg-slate-100 hover:text-slate-900"
                                    >
                                        <Cog6ToothIcon className="h-5 w-5" />
                                        <span>Settings</span>
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </Dialog>
            </Transition>
        </>
    );
};

export default Sidebar;

