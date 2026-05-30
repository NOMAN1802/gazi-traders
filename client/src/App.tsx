import { Navigate, Route, Routes } from 'react-router-dom';
import { useEffect } from 'react';
import ShellLayout from '@/components/layout/ShellLayout';
import DashboardPage from '@/pages/dashboard/DashboardPage';
import ProductsPage from '@/pages/products/ProductsPage';
import ProductFormPage from '@/pages/products/ProductFormPage';
import CategoriesPage from '@/pages/categories/CategoriesPage';
import UnitsPage from '@/pages/units/UnitsPage';
import StockIntakeListPage from '@/pages/stock-intake/StockIntakeListPage';
import AddStockPage from '@/pages/stock-intake/AddStockPage';
import StockIntakeDetailPage from '@/pages/stock-intake/StockIntakeDetailPage';
import SuppliersPage from '@/pages/suppliers/SuppliersPage';
import DailyStockPage from '@/pages/reports/DailyStockPage';
import InvoicesPage from '@/pages/invoices/InvoicesPage';
import CreateSalePage from '@/pages/invoices/CreateSalePage';
import EditOrderPage from '@/pages/invoices/EditOrderPage';
import PrintInvoicePage from '@/pages/invoices/PrintInvoicePage';
import TodaysOrdersPage from '@/pages/orders/TodaysOrdersPage';
import CustomersPage from '@/pages/customers/CustomersPage';
import CustomerLedgerPage from '@/pages/customers/CustomerLedgerPage';
import CustomerLedgerListPage from '@/pages/customers/CustomerLedgerListPage';
import CreateCustomerPage from '@/pages/customers/CreateCustomerPage';
import EditCustomerPage from '@/pages/customers/EditCustomerPage';
import ReportsPage from '@/pages/reports/ReportsPage';
import DailyReportPage from '@/pages/reports/DailyReportPage';
import SaleReportPage from '@/pages/reports/SaleReportPage';
import StockReportPage from '@/pages/reports/StockReportPage';
import TransactionsPage from '@/pages/transactions/TransactionsPage';
import DueBillsPage from '@/pages/due-bills/DueBillsPage';
import AddDueBillPage from '@/pages/due-bills/AddDueBillPage';
import ProfilePage from '@/pages/profile/ProfilePage';
import SettingsPage from '@/pages/settings/SettingsPage';
import UsersPage from '@/pages/users/UsersPage';
import LoginPage from '@/pages/auth/LoginPage';
import ProtectedRoute from '@/routes/ProtectedRoute';
import AdminRoute from '@/routes/AdminRoute';
import Loader from '@/components/common/Loader';
import { useRefreshTokenMutation } from '@/services/authApi';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { logout, setInitializing } from '@/features/auth/authSlice';

function App() {
  const dispatch = useAppDispatch();
  const { accessToken, refreshToken, initializing } = useAppSelector((state) => state.auth);
  const [refreshTokenMutation] = useRefreshTokenMutation();

  useEffect(() => {
    const hydrate = async () => {
      if (!initializing) return;
      if (!accessToken && refreshToken) {
        try {
          await refreshTokenMutation({ refreshToken }).unwrap();
        } catch (error) {
          console.error(error);
          dispatch(logout());
        } finally {
          dispatch(setInitializing(false));
        }
      } else {
        dispatch(setInitializing(false));
      }
    };

    hydrate();
  }, [accessToken, refreshToken, initializing, refreshTokenMutation, dispatch]);

  if (initializing) {
    return <Loader fullScreen message="Booting workspace..." />;
  }

  return (
    <Routes>
      <Route path="/login" element={accessToken ? <Navigate to="/" replace /> : <LoginPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<ShellLayout />}>
          <Route index element={<DashboardPage />} />
          <Route path="products" element={<ProductsPage />} />
          <Route path="products/new" element={<ProductFormPage />} />
          <Route path="products/edit/:id" element={<ProductFormPage />} />
          <Route path="stock-intake" element={<StockIntakeListPage />} />
          <Route path="stock-intake/add" element={<AddStockPage />} />
          <Route path="stock-intake/:id" element={<StockIntakeDetailPage />} />
          <Route path="categories" element={<CategoriesPage />} />
          <Route path="units" element={<UnitsPage />} />
          <Route path="suppliers" element={<SuppliersPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/create" element={<CreateSalePage />} />
          <Route path="invoices/edit/:id" element={<EditOrderPage />} />
          <Route path="orders/today" element={<TodaysOrdersPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="customers/new" element={<CreateCustomerPage />} />
          <Route path="customers/ledger" element={<CustomerLedgerListPage />} />
          <Route path="customers/:id/edit" element={<EditCustomerPage />} />
          <Route path="customers/:customerName/ledger" element={<CustomerLedgerPage />} />
          <Route element={<AdminRoute />}>
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/daily" element={<DailyReportPage />} />
            <Route path="reports/daily-stock" element={<DailyStockPage />} />
            <Route path="reports/sale" element={<SaleReportPage />} />
            <Route path="reports/stock" element={<StockReportPage />} />
          </Route>
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="due-bills" element={<DueBillsPage />} />
          <Route path="due-bills/add" element={<AddDueBillPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="users" element={<UsersPage />} />
        </Route>
        {/* Print pages - no shell layout */}
        <Route path="invoices/:id/print" element={<PrintInvoicePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
