'use client';

import { useState, useEffect } from 'react';
import { Loader2, FileText } from 'lucide-react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { testsApi, resultsApi } from '@/lib/api';

interface AddTestResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  onSuccess?: () => void;
}

export default function AddTestResultModal({ open, onOpenChange, studentId, onSuccess }: AddTestResultModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingTests, setLoadingTests] = useState(false);
  const [error, setError] = useState('');
  const [tests, setTests] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    testId: '',
    // Totals
    totalCorrect: '',
    totalWrong: '',
    totalUnattempted: '',
    totalScore: '',
    percentage: '',
    rank: '',
    // Physics
    phyRight: '',
    phyWrong: '',
    phyUnattempted: '',
    phyScore: '',
    // Chemistry
    chemRight: '',
    chemWrong: '',
    chemUnattempted: '',
    chemScore: '',
    // Maths
    mathRight: '',
    mathWrong: '',
    mathUnattempted: '',
    mathScore: '',
    remarks: ''
  });

  useEffect(() => {
    if (open) {
      fetchTests();
    }
  }, [open]);

  const fetchTests = async () => {
    try {
      setLoadingTests(true);
      const response = await testsApi.getAll(1, 1000); // Fetch up to 1000 tests for dropdown
      // Handle both array (legacy?) and object with tests property (current)
      if (Array.isArray(response.data)) {
        setTests(response.data);
      } else if (response.data && Array.isArray(response.data.tests)) {
        setTests(response.data.tests);
      } else {
        console.error('Unexpected tests API response format:', response.data);
        setTests([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch tests:', err);
    } finally {
      setLoadingTests(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validate required fields
      if (!formData.testId) {
        setError('Please select a test');
        setLoading(false);
        return;
      }

      // Create test result
      const resultData = {
        studentId: studentId,
        testId: formData.testId,
        totals: {
          totalCorrect: parseFloat(formData.totalCorrect) || 0,
          totalWrong: parseFloat(formData.totalWrong) || 0,
          totalUnattempted: parseFloat(formData.totalUnattempted) || 0,
          totalScore: parseFloat(formData.totalScore) || 0,
          percentage: parseFloat(formData.percentage) || 0,
          rank: parseInt(formData.rank) || 0
        },
        physics: {
          right: parseFloat(formData.phyRight) || 0,
          wrong: parseFloat(formData.phyWrong) || 0,
          unattempted: parseFloat(formData.phyUnattempted) || 0,
          score: parseFloat(formData.phyScore) || 0,
          unattemptedQuestions: [],
          negativeQuestions: []
        },
        chemistry: {
          right: parseFloat(formData.chemRight) || 0,
          wrong: parseFloat(formData.chemWrong) || 0,
          unattempted: parseFloat(formData.chemUnattempted) || 0,
          score: parseFloat(formData.chemScore) || 0,
          unattemptedQuestions: [],
          negativeQuestions: []
        },
        maths: {
          right: parseFloat(formData.mathRight) || 0,
          wrong: parseFloat(formData.mathWrong) || 0,
          unattempted: parseFloat(formData.mathUnattempted) || 0,
          score: parseFloat(formData.mathScore) || 0,
          unattemptedQuestions: [],
          negativeQuestions: []
        },
        remarks: formData.remarks || ''
      };

      await resultsApi.create(resultData);

      // Reset form
      setFormData({
        testId: '',
        totalCorrect: '',
        totalWrong: '',
        totalUnattempted: '',
        totalScore: '',
        percentage: '',
        rank: '',
        phyRight: '',
        phyWrong: '',
        phyUnattempted: '',
        phyScore: '',
        chemRight: '',
        chemWrong: '',
        chemUnattempted: '',
        chemScore: '',
        mathRight: '',
        mathWrong: '',
        mathUnattempted: '',
        mathScore: '',
        remarks: ''
      });

      // Close modal
      onOpenChange(false);

      // Call success callback
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || 'Failed to create test result';
      setError(errorMsg);
      console.error('Create test result error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Add Test Result"
      description="Manually add a test result for this student. All fields are optional except test selection."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
            {error}
          </div>
        )}

        {/* Test Selection */}
        <div className="space-y-2">
          <label htmlFor="testId" className="text-sm font-medium">
            Test <span className="text-red-500">*</span>
          </label>
          {loadingTests ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading tests...
            </div>
          ) : (
            <select
              id="testId"
              value={formData.testId}
              onChange={(e) => handleChange('testId', e.target.value)}
              required
              disabled={loading}
              className="w-full h-10 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="">Select a test</option>
              {tests.map((test) => (
                <option key={test._id} value={test._id}>
                  {test.testName} - {new Date(test.testDate).toLocaleDateString()}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Totals Section */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
          <h3 className="text-sm font-semibold mb-3 text-slate-900">Total Scores</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Total Correct</label>
              <Input
                type="number"
                value={formData.totalCorrect}
                onChange={(e) => handleChange('totalCorrect', e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Total Wrong</label>
              <Input
                type="number"
                value={formData.totalWrong}
                onChange={(e) => handleChange('totalWrong', e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Total Unattempted</label>
              <Input
                type="number"
                value={formData.totalUnattempted}
                onChange={(e) => handleChange('totalUnattempted', e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Total Score</label>
              <Input
                type="number"
                value={formData.totalScore}
                onChange={(e) => handleChange('totalScore', e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Percentage</label>
              <Input
                type="number"
                step="0.01"
                value={formData.percentage}
                onChange={(e) => handleChange('percentage', e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Rank</label>
              <Input
                type="number"
                value={formData.rank}
                onChange={(e) => handleChange('rank', e.target.value)}
                placeholder="0"
                disabled={loading}
              />
            </div>
          </div>
        </div>

        {/* Subject Scores */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Physics */}
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-red-900">Physics</h3>
            <div className="space-y-2">
              <Input
                type="number"
                value={formData.phyRight}
                onChange={(e) => handleChange('phyRight', e.target.value)}
                placeholder="Right"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.phyWrong}
                onChange={(e) => handleChange('phyWrong', e.target.value)}
                placeholder="Wrong"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.phyUnattempted}
                onChange={(e) => handleChange('phyUnattempted', e.target.value)}
                placeholder="Unattempted"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.phyScore}
                onChange={(e) => handleChange('phyScore', e.target.value)}
                placeholder="Score"
                disabled={loading}
                className="text-sm"
              />
            </div>
          </div>

          {/* Chemistry */}
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-green-900">Chemistry</h3>
            <div className="space-y-2">
              <Input
                type="number"
                value={formData.chemRight}
                onChange={(e) => handleChange('chemRight', e.target.value)}
                placeholder="Right"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.chemWrong}
                onChange={(e) => handleChange('chemWrong', e.target.value)}
                placeholder="Wrong"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.chemUnattempted}
                onChange={(e) => handleChange('chemUnattempted', e.target.value)}
                placeholder="Unattempted"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.chemScore}
                onChange={(e) => handleChange('chemScore', e.target.value)}
                placeholder="Score"
                disabled={loading}
                className="text-sm"
              />
            </div>
          </div>

          {/* Maths */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold mb-3 text-blue-900">Maths</h3>
            <div className="space-y-2">
              <Input
                type="number"
                value={formData.mathRight}
                onChange={(e) => handleChange('mathRight', e.target.value)}
                placeholder="Right"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.mathWrong}
                onChange={(e) => handleChange('mathWrong', e.target.value)}
                placeholder="Wrong"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.mathUnattempted}
                onChange={(e) => handleChange('mathUnattempted', e.target.value)}
                placeholder="Unattempted"
                disabled={loading}
                className="text-sm"
              />
              <Input
                type="number"
                value={formData.mathScore}
                onChange={(e) => handleChange('mathScore', e.target.value)}
                placeholder="Score"
                disabled={loading}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Remarks */}
        <div className="space-y-2">
          <label htmlFor="remarks" className="text-sm font-medium">
            Remarks
          </label>
          <textarea
            id="remarks"
            value={formData.remarks}
            onChange={(e) => handleChange('remarks', e.target.value)}
            placeholder="Enter any remarks"
            rows={2}
            disabled={loading}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
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
                <FileText className="mr-2 h-4 w-4" />
                Add Test Result
              </>
            )}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

