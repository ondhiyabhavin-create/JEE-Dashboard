'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Users, UserPlus, Grid3x3, List, Trash2, MoreVertical, Mail } from 'lucide-react';
import Link from 'next/link';
import { studentsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/useToast';
import CountUp from '@/components/CountUp';
import CreateStudentModal from '@/components/CreateStudentModal';

interface Student {
  _id: string;
  rollNumber: string;
  name: string;
  batch: string;
  email?: string;
  sourceType?: 'manual' | 'excel';
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  const [batches, setBatches] = useState<string[]>([]);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [sourceFilter, setSourceFilter] = useState<string>(''); // 'manual', 'excel', or '' for all
  const [viewMode, setViewMode] = useState<'students' | 'batch'>('students');
  const [allStudents, setAllStudents] = useState<Student[]>([]); // Store all students for batch view
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showFinalDeleteAllConfirm, setShowFinalDeleteAllConfirm] = useState(false);
  const [showBatchDeleteConfirmDialog, setShowBatchDeleteConfirmDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<string | null>(null);
  const [studentNameToDelete, setStudentNameToDelete] = useState<string>('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [batchToDelete, setBatchToDelete] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    fetchStudents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search, batchFilter, sourceFilter]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentsApi.getAll(page, 20, search, sourceFilter);
      let studentList = response.data.students;

      // Filter by batch (client-side since backend doesn't support batch filter yet)
      if (batchFilter) {
        studentList = studentList.filter((s: Student) => s.batch === batchFilter);
      }

      setStudents(studentList);
      setPagination(response.data.pagination);

      // Extract unique batches from all students (not filtered)
      const allStudentsResponse = await studentsApi.getAll(1, 1000, '', ''); // Get all for batch list
      const allStudentsList = allStudentsResponse.data.students;
      
      // Apply filters to all students for batch view
      let filteredAllStudents = allStudentsList;
      if (search) {
        filteredAllStudents = filteredAllStudents.filter((s: Student) => 
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.rollNumber.toLowerCase().includes(search.toLowerCase())
        );
      }
      if (sourceFilter) {
        filteredAllStudents = filteredAllStudents.filter((s: Student) => s.sourceType === sourceFilter);
      }
      if (batchFilter) {
        filteredAllStudents = filteredAllStudents.filter((s: Student) => s.batch === batchFilter);
      }
      
      setAllStudents(filteredAllStudents);
      const uniqueBatches = Array.from(new Set(allStudentsList.map((s: Student) => s.batch))) as string[];
      setBatches(uniqueBatches);
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = (studentId: string, studentName: string) => {
    setStudentToDelete(studentId);
    setStudentNameToDelete(studentName);
    setOpenMenuId(null); // Close the menu
    setShowDeleteConfirm(true);
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    
    setDeleting(true);
    try {
      await studentsApi.delete(studentToDelete);
      showSuccess('Student and all related data deleted successfully');
      setStudentToDelete(null);
      fetchStudents();
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      showError(err.response?.data?.error || 'Failed to delete student');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleDeleteAll = async () => {
    setDeleting(true);
    try {
      await studentsApi.deleteAll();
      showSuccess('All students and related data deleted successfully');
      fetchStudents();
    } catch (err: any) {
      console.error('Failed to delete all students:', err);
      showError(err.response?.data?.error || 'Failed to delete all students');
    } finally {
      setDeleting(false);
      setShowFinalDeleteAllConfirm(false);
    }
  };

  const handleDeleteBatch = (batchName: string) => {
    setBatchToDelete(batchName);
    setShowBatchDeleteConfirmDialog(true);
  };

  const confirmDeleteBatch = async () => {
    if (!batchToDelete) return;
    
    setDeleting(true);
    try {
      await studentsApi.deleteByBatch(batchToDelete);
      showSuccess(`Successfully deleted all students from batch "${batchToDelete}" and related data`);
      setBatchToDelete('');
      fetchStudents();
    } catch (err: any) {
      console.error('Failed to delete batch:', err);
      showError(err.response?.data?.error || 'Failed to delete batch');
    } finally {
      setDeleting(false);
      setShowBatchDeleteConfirmDialog(false);
    }
  };

  if (loading && students.length === 0) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading students...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Students</h1>
            <p className="text-muted-foreground">
              <CountUp value={pagination.total} /> students registered
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="destructive"
              onClick={() => setShowDeleteAllConfirm(true)}
              disabled={deleting || pagination.total === 0}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete All
            </Button>
            <Button
              onClick={() => setCreateModalOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Add New Student
            </Button>
          </div>
        </motion.div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
            onClick={() => setViewMode('students')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">
                    <CountUp value={pagination.total} />
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer"
            onClick={() => setViewMode('batch')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Batches</p>
                  <p className="text-2xl font-bold">
                    <CountUp value={batches.length} />
                  </p>
                </div>
                <Filter className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Current Page</p>
                  <p className="text-2xl font-bold">
                    <CountUp value={pagination.page} />
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* View Toggle and Filters */}
        <Card>
          <CardContent className="p-4 space-y-4">
            {/* View Toggle */}
            <div className="flex items-center justify-between">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'students' | 'batch')}>
                <TabsList>
                  <TabsTrigger value="students" className="flex items-center gap-2">
                    <List className="h-4 w-4" />
                    Students
                  </TabsTrigger>
                  <TabsTrigger value="batch" className="flex items-center gap-2">
                    <Grid3x3 className="h-4 w-4" />
                    Batch
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, roll number..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10"
                />
              </div>
              <select
                value={batchFilter}
                onChange={(e) => {
                  setBatchFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">All Batches</option>
                {batches.map((batch) => (
                  <option key={batch} value={batch}>
                    {batch}
                  </option>
                ))}
              </select>
              <select
                value={sourceFilter}
                onChange={(e) => {
                  setSourceFilter(e.target.value);
                  setPage(1);
                }}
                className="h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                <option value="">All Students</option>
                <option value="manual">Manually Created</option>
                <option value="excel">Excel Imported</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Student Grid View */}
        {viewMode === 'students' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            {students.map((student) => (
              <motion.div key={student._id} variants={item}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative">
                  <CardContent className="p-6">
                    {/* 3-dot menu button */}
                    <div className="absolute top-4 right-4">
                      <div className="relative">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(openMenuId === student._id ? null : student._id);
                          }}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                        
                        {/* Dropdown menu */}
                        {openMenuId === student._id && (
                          <>
                            <div 
                              className="fixed inset-0 z-10" 
                              onClick={() => setOpenMenuId(null)}
                            />
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteStudent(student._id, student.name);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="h-4 w-4" />
                                Delete Student
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <Link href={`/students/${student._id}`} className="block">
                      <div>
                        <div className="flex items-start justify-between mb-2 pr-8">
                          <h3 className="font-semibold text-lg">{student.name}</h3>
                          {student.sourceType && (
                            <Badge 
                              variant={student.sourceType === 'manual' ? 'default' : 'secondary'}
                              className="text-xs"
                            >
                              {student.sourceType === 'manual' ? 'Manual' : 'Excel'}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">Roll: {student.rollNumber}</p>
                        {student.email && (
                          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-2">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{student.email}</span>
                          </div>
                        )}
                        <Badge variant="secondary">
                          {student.batch}
                        </Badge>
                      </div>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Batch Grid View */}
        {viewMode === 'batch' && (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {batches
              .filter(batch => {
                // Filter batches based on batchFilter
                if (batchFilter) return batch === batchFilter;
                return true;
              })
              .map((batch) => {
                const batchStudents = allStudents.filter((s: Student) => s.batch === batch);
                if (batchStudents.length === 0) return null;
                
                return (
                  <motion.div key={batch} variants={item}>
                    <Card className="h-full hover:shadow-lg transition-all duration-200">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <span>{batch}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {batchStudents.length} {batchStudents.length === 1 ? 'student' : 'students'}
                            </Badge>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteBatch(batch)}
                              disabled={deleting}
                              className="h-7 px-2"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                          {batchStudents.map((student) => (
                            <Link key={student._id} href={`/students/${student._id}`}>
                              <div className="p-3 border rounded-lg hover:bg-slate-50 transition-colors cursor-pointer">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <p className="font-medium text-sm">{student.name}</p>
                                    <p className="text-xs text-muted-foreground">Roll: {student.rollNumber}</p>
                                  </div>
                                  {student.sourceType && (
                                    <Badge 
                                      variant={student.sourceType === 'manual' ? 'default' : 'secondary'}
                                      className="text-xs ml-2"
                                    >
                                      {student.sourceType === 'manual' ? 'Manual' : 'Excel'}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
          </motion.div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.pages}
            </span>
            <Button
              variant="outline"
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
            >
              Next
            </Button>
          </div>
        )}

        {/* Create Student Modal */}
        <CreateStudentModal
          open={createModalOpen}
          onOpenChange={setCreateModalOpen}
          onSuccess={() => {
            // Refresh the student list after creation
            fetchStudents();
          }}
        />

        {/* Delete Student Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Student"
          message={`Are you sure you want to delete ${studentNameToDelete}? This will permanently delete:\n\n• All test results and scores\n• All backlog items and topic statuses\n• All visit records\n• All personal information (name, contact, address, remarks, etc.)\n\nThis action cannot be undone.`}
          confirmText={deleting ? "Deleting..." : "Delete Student"}
          cancelText="Cancel"
          variant="destructive"
          onConfirm={confirmDeleteStudent}
        />

        {/* Delete All - First Confirmation */}
        <ConfirmDialog
          open={showDeleteAllConfirm}
          onOpenChange={setShowDeleteAllConfirm}
          title="Delete All Students"
          message={`⚠️ WARNING: This will delete ALL ${pagination.total} students and ALL related data (test results, visits, backlog items, topic statuses). This action cannot be undone. Are you sure you want to proceed?`}
          confirmText="Yes, Continue"
          cancelText="Cancel"
          variant="destructive"
          onConfirm={() => {
            setShowDeleteAllConfirm(false);
            setShowFinalDeleteAllConfirm(true);
          }}
        />

        {/* Delete All - Final Confirmation */}
        <ConfirmDialog
          open={showFinalDeleteAllConfirm}
          onOpenChange={setShowFinalDeleteAllConfirm}
          title="Final Confirmation"
          message={`🚨 FINAL WARNING: You are about to delete ALL ${pagination.total} students and ALL related data. This is irreversible. Type "DELETE ALL" to confirm, or cancel to abort.`}
          confirmText={deleting ? "Deleting..." : "DELETE ALL"}
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleDeleteAll}
        />

        {/* Delete Batch Confirmation Dialog */}
        <ConfirmDialog
          open={showBatchDeleteConfirmDialog}
          onOpenChange={setShowBatchDeleteConfirmDialog}
          title="Delete Batch"
          message={`Are you sure you want to delete all students in batch "${batchToDelete}"? This will permanently delete all students in this batch and all related data including test results, visits, backlog items, and topic statuses. This action cannot be undone.`}
          confirmText={deleting ? "Deleting..." : "Delete Batch"}
          cancelText="Cancel"
          variant="destructive"
          onConfirm={confirmDeleteBatch}
        />

      </div>
    </div>
  );
}
