'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, User, FileText, Calendar, BookOpen, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { studentsApi, resultsApi, visitsApi, backlogApi } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/useToast';
import OverviewTab from '@/components/premium/OverviewTab';
import TestsTabPremium from '@/components/premium/TestsTabPremium';
import VisitsTabPremium from '@/components/premium/VisitsTabPremium';
import BacklogTabPremium from '@/components/premium/BacklogTabPremium';

export default function StudentDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const studentId = params.id as string;
  const [student, setStudent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'user');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    fetchStudent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchStudent = async () => {
    try {
      setLoading(true);
      const response = await studentsApi.getById(studentId);
      setStudent(response.data);
    } catch (err: any) {
      console.error('Failed to fetch student:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await studentsApi.delete(studentId);
      showSuccess('Student and all related data deleted successfully');
      router.push('/students');
    } catch (err: any) {
      console.error('Failed to delete student:', err);
      showError(err.response?.data?.error || 'Failed to delete student');
    } finally {
      setDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading student details...</p>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Student not found</p>
            <Link href="/students">
              <Button variant="outline" className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Students
              </Button>
            </Link>
          </CardContent>
        </Card>
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
          className="flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Link href="/students">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-4xl font-bold text-foreground">{student.name}</h1>
              <p className="text-muted-foreground">
                Roll Number: {student.rollNumber} • Batch: {student.batch}
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Student
          </Button>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="user" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              User
            </TabsTrigger>
            <TabsTrigger value="tests" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Test
            </TabsTrigger>
            <TabsTrigger value="visits" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Visit
            </TabsTrigger>
            <TabsTrigger value="backlog" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Backlog
            </TabsTrigger>
          </TabsList>

          <AnimatePresence mode="wait">
            <TabsContent value="user" className="mt-6">
              <motion.div
                key="user"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <OverviewTab student={student} onUpdate={fetchStudent} />
              </motion.div>
            </TabsContent>

            <TabsContent value="tests" className="mt-6">
              <motion.div
                key="tests"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <TestsTabPremium studentId={studentId} student={student} />
              </motion.div>
            </TabsContent>

            <TabsContent value="visits" className="mt-6">
              <motion.div
                key="visits"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <VisitsTabPremium studentId={studentId} />
              </motion.div>
            </TabsContent>

            <TabsContent value="backlog" className="mt-6">
              <motion.div
                key="backlog"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <BacklogTabPremium studentId={studentId} />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Student"
          message={`Are you sure you want to delete ${student.name}? This will permanently delete the student and all related data including test results, visits, backlog items, and topic statuses. This action cannot be undone.`}
          confirmText={deleting ? "Deleting..." : "Delete"}
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleDelete}
        />
      </div>
    </div>
  );
}
