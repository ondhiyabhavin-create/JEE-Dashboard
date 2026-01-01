'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, UserPlus } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { studentsApi } from '@/lib/api';

interface CreateStudentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function CreateStudentModal({ open, onOpenChange, onSuccess }: CreateStudentModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    rollNumber: '',
    name: '',
    batch: '',
    parentName: '',
    parentOccupation: '',
    address: '',
    contactNumber: '',
    generalRemark: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.rollNumber.trim()) {
        setError('Roll Number is required');
        setLoading(false);
        return;
      }
      if (!formData.name.trim()) {
        setError('Name is required');
        setLoading(false);
        return;
      }
      if (!formData.batch.trim()) {
        setError('Batch is required');
        setLoading(false);
        return;
      }

      // Create student
      const response = await studentsApi.create({
        rollNumber: formData.rollNumber.trim(),
        name: formData.name.trim(),
        batch: formData.batch.trim(),
        parentName: formData.parentName.trim() || '',
        parentOccupation: formData.parentOccupation.trim() || '',
        address: formData.address.trim() || '',
        contactNumber: formData.contactNumber.trim() || '',
        generalRemark: formData.generalRemark.trim() || ''
      });

      // Reset form
      setFormData({
        rollNumber: '',
        name: '',
        batch: '',
        parentName: '',
        parentOccupation: '',
        address: '',
        contactNumber: '',
        generalRemark: ''
      });

      // Close modal
      onOpenChange(false);

      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }

      // Redirect to student detail page
      router.push(`/students/${response.data._id}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create student';
      setError(errorMsg);
      console.error('Create student error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(''); // Clear error when user types
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create New Student"
      description="Manually create a new student record. All fields can be filled later."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Required Fields */}
          <div className="space-y-2">
            <label htmlFor="rollNumber" className="text-sm font-medium">
              Roll Number <span className="text-red-500">*</span>
            </label>
            <Input
              id="rollNumber"
              value={formData.rollNumber}
              onChange={(e) => handleChange('rollNumber', e.target.value)}
              placeholder="Enter roll number"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Name <span className="text-red-500">*</span>
            </label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Enter student name"
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="batch" className="text-sm font-medium">
              Batch <span className="text-red-500">*</span>
            </label>
            <Input
              id="batch"
              value={formData.batch}
              onChange={(e) => handleChange('batch', e.target.value)}
              placeholder="Enter batch"
              required
              disabled={loading}
            />
          </div>

          {/* Optional Fields */}
          <div className="space-y-2">
            <label htmlFor="parentName" className="text-sm font-medium">
              Parent Name
            </label>
            <Input
              id="parentName"
              value={formData.parentName}
              onChange={(e) => handleChange('parentName', e.target.value)}
              placeholder="Enter parent name"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="parentOccupation" className="text-sm font-medium">
              Parent Occupation
            </label>
            <Input
              id="parentOccupation"
              value={formData.parentOccupation}
              onChange={(e) => handleChange('parentOccupation', e.target.value)}
              placeholder="Enter parent occupation"
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="contactNumber" className="text-sm font-medium">
              Contact Number
            </label>
            <Input
              id="contactNumber"
              value={formData.contactNumber}
              onChange={(e) => handleChange('contactNumber', e.target.value)}
              placeholder="Enter contact number"
              disabled={loading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="address" className="text-sm font-medium">
            Address
          </label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => handleChange('address', e.target.value)}
            placeholder="Enter address"
            rows={2}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="generalRemark" className="text-sm font-medium">
            General Remark
          </label>
          <Textarea
            id="generalRemark"
            value={formData.generalRemark}
            onChange={(e) => handleChange('generalRemark', e.target.value)}
            placeholder="Enter any general remarks"
            rows={3}
            disabled={loading}
          />
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
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Student
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

