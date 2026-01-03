'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Users, FileText, TrendingUp, Award, Calendar } from 'lucide-react';
import Link from 'next/link';
import { studentsApi, testsApi, resultsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import CountUp from '@/components/CountUp';

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTests: 0,
    totalResults: 0,
    averageScore: 0,
  });
  const [loading, setLoading] = useState(true);
  const [recentTests, setRecentTests] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [studentsRes, testsRes] = await Promise.all([
        studentsApi.getAll(1, 1, ''),
        testsApi.getAll(),
      ]);

      const totalStudents = studentsRes.data.pagination.total;
      // Handle both response formats: { tests: [...], pagination: {...} } or just [...]
      const tests = Array.isArray(testsRes.data) 
        ? testsRes.data 
        : (testsRes.data?.tests || []);
      
      // Ensure tests is an array
      if (!Array.isArray(tests)) {
        console.error('Tests data is not an array:', testsRes.data);
        throw new Error('Invalid tests data format');
      }
      
      // Calculate total results
      let totalResults = 0;
      let totalScore = 0;
      let scoreCount = 0;

      // Get results for each test
      for (const test of tests.slice(0, 5)) {
        try {
          const resultsRes = await resultsApi.getByTest(test._id, 1, 50);
          totalResults += resultsRes.data.results.length;
          resultsRes.data.results.forEach((r: any) => {
            if (r.totals?.totalScore) {
              totalScore += r.totals.totalScore;
              scoreCount++;
            }
          });
        } catch (err) {
          // Continue if test has no results
        }
      }

      setStats({
        totalStudents,
        totalTests: tests.length,
        totalResults,
        averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
      });

      // Sort tests by date (most recent first) and take only the last 3
      const sortedTests = [...tests].sort((a, b) => {
        const dateA = new Date(a.testDate).getTime();
        const dateB = new Date(b.testDate).getTime();
        return dateB - dateA; // Descending order (most recent first)
      });
      setRecentTests(sortedTests.slice(0, 3)); // Only show last 3 recent tests
    } catch (err: any) {
      console.error('Failed to fetch dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen p-6 md:p-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted-foreground">Overview of student performance and test data</p>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Link href="/students">
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Students</p>
                    <p className="text-2xl font-bold">
                      <CountUp value={stats.totalStudents} />
                    </p>
                  </div>
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tests">
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Tests</p>
                    <p className="text-2xl font-bold">
                      <CountUp value={stats.totalTests} />
                    </p>
                  </div>
                  <FileText className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tests">
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Test Results</p>
                    <p className="text-2xl font-bold">
                      <CountUp value={stats.totalResults} />
                    </p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/tests">
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Average Score</p>
                    <p className="text-2xl font-bold">
                      <CountUp value={stats.averageScore} decimals={0} />
                    </p>
                  </div>
                  <Award className="h-8 w-8 text-primary" />
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Recent Tests */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Tests</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No tests available</p>
            ) : (
              <div className="space-y-2">
                {recentTests.map((test) => (
                  <div
                    key={test._id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{test.testName}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(test.testDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <Link href={`/tests/${test._id}`}>
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link href="/upload">
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">Upload Test Results</h3>
                    <p className="text-sm text-muted-foreground">Upload Excel file with test data</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>

          <Link href="/students">
            <Card className="hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">View All Students</h3>
                    <p className="text-sm text-muted-foreground">Browse and manage students</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </div>
  );
}

