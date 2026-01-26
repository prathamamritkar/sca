import { ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, UserRole } from '@/store/authStore';
import { useToast } from '@/hooks/use-toast';

interface ProtectedRouteProps {
    children: ReactNode;
    /** If specified, user must have one of these roles to access */
    allowedRoles?: UserRole[];
}

/**
 * ProtectedRoute - Guards routes that require authentication
 * Optionally restricts access to specific roles
 */
const ProtectedRoute = ({ children, allowedRoles }: ProtectedRouteProps) => {
    const { isAuthenticated, user } = useAuthStore();
    const navigate = useNavigate();
    const location = useLocation();
    const { toast } = useToast();

    useEffect(() => {
        // Check authentication first
        if (!isAuthenticated) {
            toast({
                title: "Authentication Required",
                description: "Please sign in to access this resource.",
                variant: "destructive"
            });
            // Redirect to auth with return URL
            navigate('/auth', {
                replace: true,
                state: { from: location.pathname }
            });
            return;
        }

        // Check role-based access if roles are specified
        if (allowedRoles && allowedRoles.length > 0) {
            const userRole = user?.role;
            if (!userRole || !allowedRoles.includes(userRole)) {
                toast({
                    title: "Access Denied",
                    description: `This section requires ${allowedRoles.join(' or ')} privileges.`,
                    variant: "destructive"
                });
                // Redirect to dashboard (safe fallback for authenticated users)
                navigate('/dashboard', { replace: true });
                return;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAuthenticated, user, allowedRoles, navigate, location.pathname]);

    // Don't render anything if not authenticated
    if (!isAuthenticated) {
        return null;
    }

    // Don't render if role check fails
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = user?.role;
        if (!userRole || !allowedRoles.includes(userRole)) {
            return null;
        }
    }

    return <>{children}</>;
};

export default ProtectedRoute;
