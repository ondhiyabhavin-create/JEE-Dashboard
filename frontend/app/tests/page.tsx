'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Users, TrendingUp, MoreVertical, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { testsApi, resultsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import CountUp from '@/components/CountUp';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/useToast';

export default function TestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 18,
    total: 0,
    pages: 0,
  });
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [showFinalDeleteAllConfirm, setShowFinalDeleteAllConfirm] = useState(false);
  const [testToDelete, setTestToDelete] = useState<string | null>(null);
  const [testNameToDelete, setTestNameToDelete] = useState<string>('');
  const [deleting, setDeleting] = useState(false);
  const { success: showSuccess, error: showError } = useToast();

  useEffect(() => {
    fetchTests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await testsApi.getAll(page, 18);
      const testsData = response.data.tests || response.data; // Handle both paginated and non-paginated responses
      const paginationData = response.data.pagination || {
        page: 1,
        limit: 18,
        total: testsData.length,
        pages: 1,
      };

      const testsWithStats = await Promise.all(
        testsData.map(async (test: any) => {
          try {
            const resultsRes = await resultsApi.getByTest(test._id, 1, 1);
            return {
              ...test,
              resultCount: resultsRes.data.pagination?.total || resultsRes.data.results?.length || 0,
            };
          } catch {
            return { ...test, resultCount: 0 };
          }
        })
      );
      setTests(testsWithStats);
      setPagination(paginationData);
    } catch (err: any) {
      console.error('Failed to fetch tests:', err);
      showError('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = (testId: string, testName: string) => {
    setTestToDelete(testId);
    setTestNameToDelete(testName);
    setShowDeleteConfirm(true);
    setOpenMenuId(null);
  };

  const confirmDeleteTest = async () => {
    if (!testToDelete) return;
    
    try {
      setDeleting(true);
      await testsApi.delete(testToDelete);
      showSuccess('Test deleted successfully');
      setShowDeleteConfirm(false);
      setTestToDelete(null);
      fetchTests();
    } catch (err: any) {
      console.error('Failed to delete test:', err);
      showError(err.response?.data?.error || 'Failed to delete test');
    } finally {
      setDeleting(false);
    }
  };


  const handleDeleteAll = async () => {
    try {
      setDeleting(true);
      await testsApi.deleteAll();
      showSuccess('All tests deleted successfully');
      setShowFinalDeleteAllConfirm(false);
      fetchTests();
    } catch (err: any) {
      console.error('Failed to delete all tests:', err);
      showError(err.response?.data?.error || 'Failed to delete all tests');
    } finally {
      setDeleting(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading tests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-foreground mb-2">Tests</h1>
            <p className="text-muted-foreground">
              <CountUp value={pagination.total} /> test{pagination.total !== 1 ? 's' : ''} registered
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
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test, index) => (
            <motion.div
              key={test._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 relative">
                {/* Three dots menu */}
                <div className="absolute top-4 right-4 z-10">
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === test._id ? null : test._id);
                      }}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                    
                    {/* Dropdown menu */}
                    {openMenuId === test._id && (
                      <>
                        <div 
                          className="fixed inset-0 z-10" 
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteTest(test._id, test.testName);
                            }}
                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete Test
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <Link href={`/tests/${test._id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between pr-16">
                      <span className="line-clamp-2">{test.testName}</span>
                      <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 ml-2" />
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {formatDate(test.testDate)}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">Max Marks</span>
                      <span className="font-semibold">{test.maxMarks}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Users className="h-4 w-4" /> Results
                      </span>
                      <span className="font-semibold">
                        <CountUp value={test.resultCount || 0} decimals={0} />
                      </span>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            </motion.div>
          ))}
        </div>

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

        {tests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tests found</p>
            </CardContent>
          </Card>
        )}

        {/* Delete Test Confirmation Dialog */}
        <ConfirmDialog
          open={showDeleteConfirm}
          onOpenChange={setShowDeleteConfirm}
          title="Delete Test"
          message={`Are you sure you want to delete "${testNameToDelete}"? This will permanently delete:\n\n• The test record\n• All test results and scores for this test\n\nThis action cannot be undone.`}
          confirmText={deleting ? "Deleting..." : "Delete Test"}
          cancelText="Cancel"
          variant="destructive"
          onConfirm={confirmDeleteTest}
        />

        {/* Delete All - First Confirmation */}
        <ConfirmDialog
          open={showDeleteAllConfirm}
          onOpenChange={setShowDeleteAllConfirm}
          title="Delete All Tests"
          message={`⚠️ WARNING: This will delete ALL ${pagination.total} test(s) and ALL related test results. This action cannot be undone. Are you sure you want to proceed?`}
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
          message={`🚨 FINAL WARNING: You are about to delete ALL ${pagination.total} test(s) and ALL related test results. This is irreversible. Type "DELETE ALL" to confirm, or cancel to abort.`}
          confirmText={deleting ? "Deleting..." : "DELETE ALL"}
          cancelText="Cancel"
          variant="destructive"
          onConfirm={handleDeleteAll}
        />
      </div>
    </div>
  );
}
