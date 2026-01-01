'use client';

import { useState, useRef, useEffect } from 'react';
import { LogOut, Settings, User, ChevronDown, Type } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import ChangePasswordModal from '@/components/ChangePasswordModal';
import ChangeHeaderModal from '@/components/ChangeHeaderModal';

export default function ProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showChangeHeader, setShowChangeHeader] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  let user = null;
  let logout = () => {};
  let isAuthenticated = false;
  
  try {
    const auth = useAuth();
    user = auth.user;
    logout = auth.logout;
    isAuthenticated = auth.isAuthenticated;
  } catch {
    // Not authenticated - will show login button
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Show login button if not authenticated
  if (!isAuthenticated || !user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-md transition-all"
      >
        <User className="h-4 w-4" />
        Login
      </Link>
    );
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
            {getInitials(user.name)}
          </div>
          <ChevronDown className={`h-4 w-4 text-slate-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-slate-200 py-2 z-50">
            <div className="px-4 py-3 border-b border-slate-200">
              <p className="text-sm font-semibold text-foreground">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
            
            <div className="py-1">
              <button
                onClick={() => {
                  setShowChangeHeader(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Type className="h-4 w-4" />
                Change Header
              </button>
              
              <button
                onClick={() => {
                  setShowChangePassword(true);
                  setIsOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Change Password
              </button>
              
              <button
                onClick={() => {
                  setIsOpen(false);
                  logout();
                }}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>

      {showChangePassword && (
        <ChangePasswordModal
          open={showChangePassword}
          onOpenChange={setShowChangePassword}
        />
      )}
      
      {showChangeHeader && (
        <ChangeHeaderModal
          open={showChangeHeader}
          onOpenChange={setShowChangeHeader}
        />
      )}
    </>
  );
}

