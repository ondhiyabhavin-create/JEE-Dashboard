'use client';

import { useState, useEffect } from 'react';
import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { User, Phone, MapPin, Briefcase, FileText, Edit2, Save, X, Plus, Trash2 } from 'lucide-react';
import { studentsApi } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface OverviewTabProps {
  student: any;
  onUpdate?: () => void;
}

export default function OverviewTab({ student, onUpdate }: OverviewTabProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Initialize form data from student prop
  const getInitialFormData = (studentData: any) => ({
    name: studentData?.name || '',
    parentName: studentData?.parentName || '',
    address: studentData?.address || '',
    batch: studentData?.batch || '',
    parentOccupation: studentData?.parentOccupation || '',
    contactNumber: studentData?.contactNumber || '',
    rollNumber: studentData?.rollNumber || '',
    generalRemark: studentData?.generalRemark || ''
  });

  const getInitialRemarks = (studentData: any) => {
    if (studentData?.remarks && Array.isArray(studentData.remarks)) {
      return studentData.remarks.map((r: any, index: number) => ({
        _id: r._id || `remark-${index}-${Date.now()}`,
        remark: r.remark || '',
        date: r.date ? new Date(r.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      }));
    }
    return [];
  };

  const [formData, setFormData] = useState(() => getInitialFormData(student));
  const [remarks, setRemarks] = useState<any[]>(() => getInitialRemarks(student));

  // Update form data when student prop changes (only when not editing)
  useEffect(() => {
    if (!isEditing) {
      setFormData(getInitialFormData(student));
      setRemarks(getInitialRemarks(student));
    }
  }, [student?._id]);
  const [newRemark, setNewRemark] = useState({ remark: '', date: new Date().toISOString().split('T')[0] });
  const [editingRemarkId, setEditingRemarkId] = useState<string | null>(null);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const updateData = {
        ...formData,
        remarks: remarks.map(r => ({
          remark: r.remark,
          date: new Date(r.date)
        }))
      };
      await studentsApi.update(student._id, updateData);
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Failed to update student:', error);
      alert('Failed to update student: ' + (error.response?.data?.error || error.message));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: student.name || '',
      parentName: student.parentName || '',
      address: student.address || '',
      batch: student.batch || '',
      parentOccupation: student.parentOccupation || '',
      contactNumber: student.contactNumber || '',
      rollNumber: student.rollNumber || '',
      generalRemark: student.generalRemark || ''
    });
    setRemarks(
      student.remarks && Array.isArray(student.remarks)
        ? student.remarks.map((r: any) => ({
            _id: r._id || Date.now().toString(),
            remark: r.remark || '',
            date: r.date ? new Date(r.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
          }))
        : []
    );
    setIsEditing(false);
    setEditingRemarkId(null);
    setNewRemark({ remark: '', date: new Date().toISOString().split('T')[0] });
  };

  const handleAddRemark = () => {
    if (newRemark.remark.trim()) {
      setRemarks([...remarks, {
        _id: Date.now().toString(),
        remark: newRemark.remark,
        date: newRemark.date
      }]);
      setNewRemark({ remark: '', date: new Date().toISOString().split('T')[0] });
    }
  };

  const handleEditRemark = (id: string) => {
    setEditingRemarkId(id);
  };

  const handleSaveRemark = (id: string) => {
    setRemarks(remarks.map(r => r._id === id ? { ...r, remark: r.remark, date: r.date } : r));
    setEditingRemarkId(null);
  };

  const handleDeleteRemark = (id: string) => {
    setRemarks(remarks.filter(r => r._id !== id));
  };

  const handleUpdateRemark = (id: string, field: string, value: string) => {
    setRemarks(remarks.map(r => r._id === id ? { ...r, [field]: value } : r));
  };

  return (
    <div className="space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Student Profile</h2>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
            <Edit2 className="h-4 w-4 mr-2" />
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
            <Button onClick={handleCancel} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Table 1: Personal Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Student Name</label>
              {isEditing ? (
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter student name"
                />
              ) : (
                <p className="font-medium">{formData.name || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Parent Name</label>
              {isEditing ? (
                <Input
                  value={formData.parentName}
                  onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                  placeholder="Enter parent name"
                />
              ) : (
                <p className="font-medium">{formData.parentName || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Address</label>
              {isEditing ? (
                <Textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Enter address"
                  rows={3}
                />
              ) : (
                <p className="font-medium">{formData.address || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">General Remark</label>
              {isEditing ? (
                <Textarea
                  value={formData.generalRemark}
                  onChange={(e) => setFormData({ ...formData, generalRemark: e.target.value })}
                  placeholder="Enter general remark"
                  rows={3}
                />
              ) : (
                <p className="font-medium whitespace-pre-wrap">{formData.generalRemark || 'No remarks'}</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Table 2: Additional Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Additional Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Batch</label>
              {isEditing ? (
                <Input
                  value={formData.batch}
                  onChange={(e) => setFormData({ ...formData, batch: e.target.value })}
                  placeholder="Enter batch"
                />
              ) : (
                <Badge variant="secondary">{formData.batch || 'Not set'}</Badge>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Parent Occupation</label>
              {isEditing ? (
                <Input
                  value={formData.parentOccupation}
                  onChange={(e) => setFormData({ ...formData, parentOccupation: e.target.value })}
                  placeholder="Enter parent occupation"
                />
              ) : (
                <p className="font-medium">{formData.parentOccupation || 'Not set'}</p>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Contact Number</label>
              {isEditing ? (
                <Input
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                  placeholder="Enter contact number"
                />
              ) : (
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{formData.contactNumber || 'Not set'}</p>
                </div>
              )}
            </div>
            <div>
              <label className="text-sm text-muted-foreground mb-1 block">Roll Number</label>
              {isEditing ? (
                <Input
                  value={formData.rollNumber}
                  onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
                  placeholder="Enter roll number"
                />
              ) : (
                <p className="font-medium">{formData.rollNumber || 'Not set'}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Remarks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Remarks History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add New Remark */}
          {isEditing && (
            <div className="p-4 border rounded-lg space-y-3">
              <div>
                <label className="text-sm font-medium mb-2 block">Add New Remark</label>
                <Textarea
                  value={newRemark.remark}
                  onChange={(e) => setNewRemark({ ...newRemark, remark: e.target.value })}
                  placeholder="Enter remark..."
                  rows={3}
                />
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-1 block">Date</label>
                  <Input
                    type="date"
                    value={newRemark.date}
                    onChange={(e) => setNewRemark({ ...newRemark, date: e.target.value })}
                  />
                </div>
                <Button onClick={handleAddRemark} size="sm" className="mt-6">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Remark
                </Button>
              </div>
            </div>
          )}

          {/* Remarks List */}
          <div className="space-y-3">
            <AnimatePresence>
              {remarks.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No remarks added yet</p>
              ) : (
                remarks.map((remark) => (
                  <motion.div
                    key={remark._id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 border rounded-lg"
                  >
                    {editingRemarkId === remark._id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={remark.remark}
                          onChange={(e) => handleUpdateRemark(remark._id, 'remark', e.target.value)}
                          rows={3}
                        />
                        <div className="flex items-center gap-3">
                          <Input
                            type="date"
                            value={remark.date}
                            onChange={(e) => handleUpdateRemark(remark._id, 'date', e.target.value)}
                            className="flex-1"
                          />
                          <Button onClick={() => handleSaveRemark(remark._id)} size="sm" variant="outline">
                            <Save className="h-4 w-4" />
                          </Button>
                          <Button onClick={() => setEditingRemarkId(null)} size="sm" variant="outline">
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <p className="text-sm text-muted-foreground mb-1">
                            {remark.date ? formatDate(new Date(remark.date)) : 'No date'}
                          </p>
                          <p className="whitespace-pre-wrap">{remark.remark}</p>
                        </div>
                        {isEditing && (
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleEditRemark(remark._id)}
                              size="sm"
                              variant="ghost"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => handleDeleteRemark(remark._id)}
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
