'use client';

import { usePathname } from 'next/navigation';
import Navbar from './Navbar';

export default function ConditionalNavbar() {
  const pathname = usePathname();
  
  // Hide navbar on login, forgot-password, and reset-password pages
  if (pathname === '/login' || pathname === '/forgot-password' || pathname === '/reset-password') {
    return null;
  }
  
  return <Navbar />;
}

