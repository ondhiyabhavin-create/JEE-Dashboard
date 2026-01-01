'use client';

import { usePathname } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import ProtectedRoute from './ProtectedRoute';

// Public routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/forgot-password', '/reset-password'];

export default function RouteProtection({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  // Check if current route is public
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname || '');

  // If it's a public route, show it without protection
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // For all other routes, require authentication
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

