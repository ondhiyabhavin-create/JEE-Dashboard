'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, FileText, Users, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { testsApi, resultsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDate } from '@/lib/utils';
import CountUp from '@/components/CountUp';

export default function TestsPage() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await testsApi.getAll();
      const testsWithStats = await Promise.all(
        response.data.map(async (test: any) => {
          try {
            const resultsRes = await resultsApi.getByTest(test._id, 1, 1);
            return {
              ...test,
              resultCount: resultsRes.data.pagination.total,
            };
          } catch {
            return { ...test, resultCount: 0 };
          }
        })
      );
      setTests(testsWithStats);
    } catch (err: any) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoading(false);
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
        >
          <h1 className="text-4xl font-bold text-foreground mb-2">Tests</h1>
          <p className="text-muted-foreground">All test records and results</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tests.map((test, index) => (
            <motion.div
              key={test._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Link href={`/tests/${test._id}`}>
                <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>{test.testName}</span>
                      <FileText className="h-5 w-5 text-muted-foreground" />
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
                </Card>
              </Link>
            </motion.div>
          ))}
        </div>

        {tests.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tests found</p>
              <Link href="/upload">
                <button className="mt-4 text-primary hover:underline">
                  Upload your first test
                </button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

