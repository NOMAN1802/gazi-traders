import { useAppSelector } from '@/hooks/store';

export const usePermissions = () => {
    const user = useAppSelector((state) => state.auth.user);
    const isAdmin = user?.role === 'admin';
    return {
        isAdmin,
        canEditDelete: isAdmin,
        canViewReports: isAdmin,
    };
};
