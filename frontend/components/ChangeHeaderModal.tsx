'use client';

import { useState, useEffect } from 'react';
import { Loader2, Type } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { authApi } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

interface ChangeHeaderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ChangeHeaderModal({ open, onOpenChange }: ChangeHeaderModalProps) {
  const { user, checkAuth } = useAuth();
  const [headerName, setHeaderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Initialize with current header name when modal opens
  useEffect(() => {
    if (open && user) {
      setHeaderName(user.headerName || 'Spectrum Student Data');
      setError('');
      setSuccess(false);
    }
  }, [open, user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    if (!headerName || headerName.trim().length === 0) {
      setError('Header name is required');
      return;
    }

    if (headerName.trim().length > 100) {
      setError('Header name must be 100 characters or less');
      return;
    }

    setLoading(true);

    try {
      await authApi.updateHeaderName(headerName.trim());
      setSuccess(true);
      // Refresh user data to get updated header name
      await checkAuth();
      setTimeout(() => {
        onOpenChange(false);
        setSuccess(false);
      }, 2000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update header name');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (value: string) => {
    setHeaderName(value);
    setError('');
    setSuccess(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Change Header Name"
      description="Update the application header name that appears throughout the system"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
            Header name updated successfully!
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="headerName" className="text-sm font-medium">
            Header Name
          </label>
          <div className="relative">
            <Type className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="headerName"
              type="text"
              value={headerName}
              onChange={(e) => handleChange(e.target.value)}
              placeholder="Enter header name"
              required
              disabled={loading}
              maxLength={100}
              className="pl-10 h-12"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            This name will appear in the navbar and throughout the application. (Max 100 characters)
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Type className="mr-2 h-4 w-4" />
                Update Header
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

