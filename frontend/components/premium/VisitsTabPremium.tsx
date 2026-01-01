'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Calendar, FileText, Trash2, X, Edit2, Save } from 'lucide-react';
import { visitsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TimePicker } from '@/components/ui/time-picker';
import { Textarea } from '@/components/ui/textarea';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDate } from '@/lib/utils';

interface VisitsTabPremiumProps {
  studentId: string;
  student?: any; // Student object with email field
}

export default function VisitsTabPremium({ studentId, student }: VisitsTabPremiumProps) {
  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState<any>(null);
  const [editingVisit, setEditingVisit] = useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    assignment: '',
    remarks: '',
  });
  const [error, setError] = useState<string>('');
  const [deleteVisitId, setDeleteVisitId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showEmailWarning, setShowEmailWarning] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState<(() => void) | null>(null);
  const [formData, setFormData] = useState({
    visitDate: new Date().toISOString().split('T')[0],
    visitTime: '10:00',
    assignment: '',
    remarks: '',
  });

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  useEffect(() => {
    fetchVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchVisits = async () => {
    try {
      setLoading(true);
      const response = await visitsApi.getByStudent(studentId);
      setVisits(response.data);
    } catch (err: any) {
      console.error('Failed to fetch visits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate that visit is in the future
    const visitDateTime = new Date(`${formData.visitDate}T${formData.visitTime}`);
    const now = new Date();

    if (visitDateTime <= now) {
      setError('Visit must be scheduled for a future date and time. Please select a date and time ahead of now.');
      return;
    }

    // Check if student has email
    const studentEmail = student?.email;
    if (!studentEmail || studentEmail.trim() === '') {
      // Show warning dialog
      setPendingSubmit(() => async () => {
        await createVisit();
      });
      setShowEmailWarning(true);
      return;
    }

    // Student has email, proceed with creating visit
    await createVisit();
  };

  const createVisit = async () => {
    try {
      await visitsApi.create({ studentId, ...formData });
      setShowForm(false);
      setError('');
      setFormData({
        visitDate: new Date().toISOString().split('T')[0],
        visitTime: '10:00',
        assignment: '',
        remarks: '',
      });
      fetchVisits();
    } catch (err: any) {
      console.error('Failed to create visit:', err);
      setError(err.response?.data?.error || 'Failed to create visit. Please try again.');
    }
  };

  const handleProceedWithoutEmail = async () => {
    setShowEmailWarning(false);
    if (pendingSubmit) {
      await pendingSubmit();
      setPendingSubmit(null);
    }
  };

  const handleCancelAndAddEmail = () => {
    setShowEmailWarning(false);
    setPendingSubmit(null);
    // Optionally, you could scroll to email field or show a message
    // For now, just close the dialog
  };

  const handleDelete = async (id: string) => {
    try {
      await visitsApi.delete(id);
      setDeleteVisitId(null);
      fetchVisits();
    } catch (err: any) {
      console.error('Failed to delete visit:', err);
    }
  };

  const handleEdit = (visit: any) => {
    setEditingVisit(visit);
    setEditFormData({
      assignment: visit.assignment || '',
      remarks: visit.remarks || '',
    });
  };

  const handleSaveEdit = async () => {
    if (!editingVisit) return;
    
    setSaving(true);
    setError('');
    try {
      // Check if date/time is being updated and student has email
      const isDateOrTimeUpdated = false; // For now, we only allow editing assignment/remarks
      // If in future we allow date/time editing, we should check email here too
      
      await visitsApi.update(editingVisit._id, {
        assignment: editFormData.assignment,
        remarks: editFormData.remarks,
      });
      setEditingVisit(null);
      setEditFormData({ assignment: '', remarks: '' });
      fetchVisits();
    } catch (err: any) {
      console.error('Failed to update visit:', err);
      setError(err.response?.data?.error || 'Failed to update visit. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditingVisit(null);
    setEditFormData({ assignment: '', remarks: '' });
    setError('');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">Visit History</h3>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Visit
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>New Visit</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                    {error}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Visit Date</label>
                    <Input
                      type="date"
                      value={formData.visitDate}
                      min={getMinDate()}
                      onChange={(e) => {
                        setFormData({ ...formData, visitDate: e.target.value });
                        setError('');
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Visit Time</label>
                    <TimePicker
                      value={formData.visitTime}
                      onChange={(value) => {
                        setFormData({ ...formData, visitTime: value });
                        setError('');
                      }}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Assignment</label>
                  <textarea
                    className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={formData.assignment}
                    onChange={(e) => setFormData({ ...formData, assignment: e.target.value })}
                    placeholder="Enter assignment details..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Remarks</label>
                  <textarea
                    className="w-full min-h-[100px] rounded-lg border border-input bg-background px-3 py-2 text-sm"
                    value={formData.remarks}
                    onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                    placeholder="Enter remarks..."
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit">Save Visit</Button>
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="space-y-2">
        {visits.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No visits recorded</p>
            </CardContent>
          </Card>
        ) : (
          visits.map((visit, index) => (
            <motion.div
              key={visit._id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className="hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => setSelectedVisit(visit)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Calendar className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">Visit {index + 1}</h3>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(visit.visitDate)}
                          {visit.visitTime && (
                            <span className="ml-2">
                              at {new Date(`2000-01-01T${visit.visitTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(visit);
                        }}
                        className="text-primary hover:text-primary"
                        title="Edit visit details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteVisitId(visit._id);
                        }}
                        className="text-destructive hover:text-destructive"
                        title="Delete visit"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Edit Form */}
              {editingVisit && editingVisit._id === visit._id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2"
                >
                  <Card className="border-2 border-indigo-200">
                    <CardContent className="p-4 bg-slate-50">
                      {error && (
                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                          {error}
                        </div>
                      )}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium mb-2 block">Assignment</label>
                          <Textarea
                            value={editFormData.assignment}
                            onChange={(e) => setEditFormData({ ...editFormData, assignment: e.target.value })}
                            placeholder="Enter assignment details..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium mb-2 block">Remarks</label>
                          <Textarea
                            value={editFormData.remarks}
                            onChange={(e) => setEditFormData({ ...editFormData, remarks: e.target.value })}
                            placeholder="Enter remarks..."
                            className="min-h-[100px]"
                          />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            type="button"
                            variant="outline"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            Cancel
                          </Button>
                          <Button
                            type="button"
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="flex items-center gap-2"
                          >
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving...' : 'Save'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </motion.div>
          ))
        )}
      </div>

      {/* Visit Detail Modal */}
      <AnimatePresence>
        {selectedVisit && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedVisit(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-background rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            >
              <div className="sticky top-0 bg-background border-b p-6 flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Visit Details</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    {formatDate(selectedVisit.visitDate)}
                    {selectedVisit.visitTime && (
                      <span className="ml-2">
                        at {new Date(`2000-01-01T${selectedVisit.visitTime}`).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                      </span>
                    )}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="rounded-lg p-2 hover:bg-muted transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="p-6 space-y-6">
                {selectedVisit.assignment && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Assignment Given
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedVisit.assignment}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {selectedVisit.remarks && (
                  <Card>
                    <CardHeader>
                      <CardTitle>General Remarks</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {selectedVisit.remarks}
                      </p>
                    </CardContent>
                  </Card>
                )}
                {!selectedVisit.assignment && !selectedVisit.remarks && (
                  <Card>
                    <CardContent className="p-12 text-center">
                      <p className="text-muted-foreground">No details recorded for this visit</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteVisitId !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteVisitId(null);
        }}
        onConfirm={() => {
          if (deleteVisitId) {
            handleDelete(deleteVisitId);
          }
        }}
        title="Delete Visit"
        message="Are you sure you want to delete this visit? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="destructive"
      />

      {/* Email Warning Dialog */}
      <ConfirmDialog
        open={showEmailWarning}
        onOpenChange={(open) => {
          if (!open) {
            setShowEmailWarning(false);
            setPendingSubmit(null);
          }
        }}
        onConfirm={handleProceedWithoutEmail}
        onCancel={handleCancelAndAddEmail}
        title="Student Email Not Found"
        message="This student doesn't have an email address. If you schedule the visit now, the student won't receive any reminder notifications (instant, 24-hour, or 6-hour reminders). Would you like to add the email first, or proceed without email (no notifications will be sent)?"
        confirmText="Proceed Without Email"
        cancelText="Cancel and Add Email"
      />
    </div>
  );
}

