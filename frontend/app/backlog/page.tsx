'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Search, Users, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { studentsApi, syllabusApi, studentTopicStatusApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CountUp from '@/components/CountUp';

export default function BacklogPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [allStudents, setAllStudents] = useState<any[]>([]); // Store all students for filtering
  const [filteredStudents, setFilteredStudents] = useState<any[]>([]); // Filtered students before pagination
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'withBacklog' | 'complete'>('withBacklog'); // Default to showing only students with backlog
  const [page, setPage] = useState(1);
  const [limit] = useState(18); // Items per page
  const [stats, setStats] = useState({
    total: 0,
    withBacklog: 0,
  });

  useEffect(() => {
    fetchStudents();
  }, []);

  // Refresh data when page becomes visible (in case syllabus was updated in another tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStudents();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    // Apply filter whenever allStudents, filter, or search changes
    if (allStudents.length > 0) {
      let filtered = [...allStudents];
      
      // Apply status filter
      if (filter === 'withBacklog') {
        // Only show students with backlog (any subject has backlog)
        filtered = allStudents.filter((student: any) => 
          student.hasBacklog === true
        );
      } else if (filter === 'complete') {
        // Show students with no backlog (all subjects have no backlog)
        filtered = allStudents.filter((student: any) => 
          student.hasBacklog === false
        );
      }
      // 'all' filter shows all students (including Medium and Good)
      
      // Also apply search filter
      if (search) {
        filtered = filtered.filter((student: any) =>
          student.name.toLowerCase().includes(search.toLowerCase()) ||
          student.rollNumber.toLowerCase().includes(search.toLowerCase()) ||
          student.batch.toLowerCase().includes(search.toLowerCase())
        );
      }
      
      setFilteredStudents(filtered);
      setPage(1); // Reset to first page when filter changes
    }
  }, [filter, search, allStudents]);

  useEffect(() => {
    // Paginate filtered students
    if (filteredStudents.length > 0) {
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      setStudents(filteredStudents.slice(startIndex, endIndex));
    } else {
      setStudents([]);
    }
  }, [filteredStudents, page, limit]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      // Fetch all students (basic info only - fast)
      const response = await studentsApi.getAll(1, 1000, '');
      const studentList = response.data.students;

      // Get total topics from syllabus - always fetch fresh data
      // Count topics (middle level), not subtopics
      let totalTopicsFromSyllabus = 0;
      try {
        const syllabusRes = await syllabusApi.getAll();
        const syllabusData = Array.isArray(syllabusRes.data) ? syllabusRes.data : (syllabusRes.data?.data || []);
        // Count all topics across all subjects (not subtopics)
        syllabusData.forEach((subjectItem: any) => {
          if (subjectItem.topics && Array.isArray(subjectItem.topics)) {
            totalTopicsFromSyllabus += subjectItem.topics.length;
          }
        });
      } catch (err) {
        console.error('Failed to fetch syllabus for total topics calculation:', err);
      }

      // Get syllabus structure to check topic counts per subject
      let syllabusData: any[] = [];
      try {
        const syllabusRes = await syllabusApi.getAll();
        syllabusData = Array.isArray(syllabusRes.data) ? syllabusRes.data : (syllabusRes.data?.data || []);
      } catch (err) {
        console.error('Failed to fetch syllabus:', err);
      }

      // Calculate total topics per subject
      const topicsPerSubject: { [key: string]: number } = {};
      syllabusData.forEach((subjectItem: any) => {
        if (subjectItem.topics && Array.isArray(subjectItem.topics)) {
          topicsPerSubject[subjectItem.subject] = subjectItem.topics.length;
        }
      });

      // Fetch topic status stats for ALL students (for stats calculation)
      // This is done in batches to avoid overwhelming the server
      let withBacklogCount = 0;
      const batchSize = 50;
      const studentsWithStats: any[] = [];
      
      for (let i = 0; i < studentList.length; i += batchSize) {
        const batch = studentList.slice(i, i + batchSize);
        const batchResults = await Promise.all(
          batch.map(async (student: any) => {
            try {
              const statusRes = await studentTopicStatusApi.getByStudent(student._id);
              const statuses = Array.isArray(statusRes.data) ? statusRes.data : (statusRes.data?.data || []);
              
              // Check backlog for each subject
              const subjectBacklog: { [key: string]: boolean } = {
                Physics: false,
                Chemistry: false,
                Mathematics: false,
              };

              // Group statuses by subject and check if all topics have both theory and solving completed
              ['Physics', 'Chemistry', 'Mathematics'].forEach((subject) => {
                const totalTopicsInSubject = topicsPerSubject[subject] || 0;
                if (totalTopicsInSubject === 0) {
                  subjectBacklog[subject] = false; // No topics, no backlog
                  return;
                }

                const subjectStatuses = statuses.filter((s: any) => 
                  s.subject === subject && (!s.subtopicName || s.subtopicName === '')
                );
                
                // If no status records exist for this subject, assume backlog (hasn't started)
                if (subjectStatuses.length === 0) {
                  subjectBacklog[subject] = true; // No records = has backlog
                  return;
                }

                // Check if all topics have both theory and solving completed
                // Only count statuses that have both completed
                const topicsWithBothCompleted = subjectStatuses.filter((s: any) => 
                  s.theoryCompleted === true && s.solvingCompleted === true
                ).length;

                // Subject has backlog if not all topics have both completed
                // If we have fewer completed topics than total topics, there's backlog
                subjectBacklog[subject] = topicsWithBothCompleted < totalTopicsInSubject;
              });

              // Student has backlog if any subject has backlog
              const hasBacklog = subjectBacklog.Physics || subjectBacklog.Chemistry || subjectBacklog.Mathematics;
              if (hasBacklog) withBacklogCount++;

              return {
                ...student,
                totalTopics: totalTopicsFromSyllabus,
                physicsBacklog: subjectBacklog.Physics,
                chemistryBacklog: subjectBacklog.Chemistry,
                mathematicsBacklog: subjectBacklog.Mathematics,
                hasBacklog,
              };
            } catch {
              return { 
                ...student, 
                totalTopics: totalTopicsFromSyllabus,
                physicsBacklog: true, // Assume backlog on error
                chemistryBacklog: true,
                mathematicsBacklog: true,
                hasBacklog: true,
              };
            }
          })
        );
        studentsWithStats.push(...batchResults);
      }

      setAllStudents(studentsWithStats);
      setStats({
        total: response.data.pagination.total,
        withBacklog: withBacklogCount,
      });
      
      // Apply initial filter after state is set
      // This will be handled by the useEffect that watches allStudents
    } catch (err: any) {
      console.error('Failed to fetch students:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading backlog data...</p>
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
            <h1 className="text-4xl font-bold text-foreground mb-2">Backlog Management</h1>
            <p className="text-muted-foreground">Track syllabus coverage and backlog for all students</p>
          </div>
          <Button
            variant="outline"
            onClick={fetchStudents}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Student Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card 
            className={`hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${filter === 'all' ? 'ring-2 ring-primary' : 'cursor-pointer'}`}
            onClick={() => setFilter('all')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Students</p>
                  <p className="text-2xl font-bold">
                    <CountUp value={stats.total} />
                  </p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${filter === 'withBacklog' ? 'ring-2 ring-orange-500' : 'cursor-pointer'}`}
            onClick={() => setFilter('withBacklog')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">With Backlog</p>
                  <p className="text-2xl font-bold text-orange-600">
                    <CountUp value={stats.withBacklog} />
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card 
            className={`hover:shadow-lg transition-all duration-200 hover:-translate-y-1 ${filter === 'complete' ? 'ring-2 ring-green-500' : 'cursor-pointer'}`}
            onClick={() => setFilter('complete')}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Coverage Complete</p>
                  <p className="text-2xl font-bold text-green-600">
                    <CountUp value={stats.total - stats.withBacklog} />
                  </p>
                </div>
                <BookOpen className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, roll number..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Students List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((student, index) => (
            <motion.div
              key={student._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.03 }}
            >
              <Link href={`/students/${student._id}?tab=backlog`}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg mb-1">{student.name}</h3>
                        <p className="text-sm text-muted-foreground">Roll: {student.rollNumber}</p>
                        <Badge variant="secondary" className="mt-2">
                          {student.batch}
                        </Badge>
                      </div>
                      <div className="pt-2 border-t space-y-1.5">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">Backlog Cleared</span>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-foreground">Physics</span>
                            <span 
                              className={!student.physicsBacklog 
                                ? "bg-white text-green-700 border-2 border-green-500 px-2 py-0.5 rounded-full text-xs font-semibold" 
                                : "bg-white text-red-700 border-2 border-red-500 px-2 py-0.5 rounded-full text-xs font-semibold"
                              }
                            >
                              {!student.physicsBacklog ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-foreground">Chemistry</span>
                            <span 
                              className={!student.chemistryBacklog 
                                ? "bg-white text-green-700 border-2 border-green-500 px-2 py-0.5 rounded-full text-xs font-semibold" 
                                : "bg-white text-red-700 border-2 border-red-500 px-2 py-0.5 rounded-full text-xs font-semibold"
                              }
                            >
                              {!student.chemistryBacklog ? 'Yes' : 'No'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 bg-slate-50 rounded-lg">
                            <span className="text-xs font-medium text-foreground">Mathematics</span>
                            <span 
                              className={!student.mathematicsBacklog 
                                ? "bg-white text-green-700 border-2 border-green-500 px-2 py-0.5 rounded-full text-xs font-semibold" 
                                : "bg-white text-red-700 border-2 border-red-500 px-2 py-0.5 rounded-full text-xs font-semibold"
                              }
                            >
                              {!student.mathematicsBacklog ? 'Yes' : 'No'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {students.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No students found</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {filteredStudents.length > limit && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((page - 1) * limit) + 1} to {Math.min(page * limit, filteredStudents.length)} of {filteredStudents.length} students
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <div className="text-sm text-muted-foreground px-4">
                    Page {page} of {Math.ceil(filteredStudents.length / limit)}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(Math.ceil(filteredStudents.length / limit), p + 1))}
                    disabled={page >= Math.ceil(filteredStudents.length / limit)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

