'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Award, FileText, Calendar, ChevronRight, Plus } from 'lucide-react';
import { resultsApi } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import CountUp from '@/components/CountUp';
import { formatDate } from '@/lib/utils';
import TestDetailModalPremium from './TestDetailModalPremium';
import AddTestResultModal from '@/components/AddTestResultModal';

interface TestsTabPremiumProps {
  studentId: string;
  student?: any;
}

export default function TestsTabPremium({ studentId, student }: TestsTabPremiumProps) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [addModalOpen, setAddModalOpen] = useState(false);

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await resultsApi.getByStudent(studentId);
      // Sort by test date (newest first)
      const sorted = response.data.sort((a: any, b: any) => {
        const dateA = a.testId?.testDate ? new Date(a.testId.testDate).getTime() : 0;
        const dateB = b.testId?.testDate ? new Date(b.testId.testDate).getTime() : 0;
        return dateB - dateA;
      });
      setResults(sorted);
    } catch (err: any) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <div className="flex justify-end mb-4">
        <Button
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Test Result
        </Button>
      </div>

      {results.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">No test results found</p>
            <Button
              onClick={() => setAddModalOpen(true)}
              variant="outline"
              className="flex items-center gap-2 mx-auto"
            >
              <Plus className="h-4 w-4" />
              Add First Test Result
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
        {results.map((result, index) => (
          <motion.div
            key={result._id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="hover:shadow-md transition-all duration-200 cursor-pointer border-2 hover:border-primary/50"
              onClick={() => setSelectedResult(result)}
            >
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-7 w-7 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-xl mb-1">
                        Test - {results.length - index}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {result.testId?.testDate
                          ? formatDate(result.testId.testDate)
                          : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-8">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground mb-1">Score</p>
                      <p className="text-2xl font-bold text-primary">
                        <CountUp value={result.totals?.totalScore || 0} decimals={0} />
                      </p>
                    </div>
                    {result.totals?.rank && (
                      <div className="text-center">
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <Award className="h-4 w-4" /> Rank
                        </p>
                        <Badge variant="default" className="text-lg px-4 py-2">
                          <CountUp value={result.totals.rank} decimals={0} />
                        </Badge>
                      </div>
                    )}
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
        </div>
      )}

      {selectedResult && (
        <TestDetailModalPremium
          result={selectedResult}
          student={student}
          onClose={() => setSelectedResult(null)}
          onUpdate={fetchResults}
        />
      )}

      <AddTestResultModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        studentId={studentId}
        onSuccess={fetchResults}
      />
    </>
  );
}
