export { AuthLoadingScreen } from './AuthLoadingScreen';
export { ProtectedRoute, type ProtectedRouteProps } from './ProtectedRoute';
/** Re-export session context: `AuthProvider` / `UserProvider`, `useAuth` / `useUser`, and routing helpers. */
export {
  AuthProvider,
  UserProvider,
  useAuth,
  useUser,
  canAccessMemberPortal,
  getDefaultDashboardPath,
} from '@/contexts/AuthContext';
