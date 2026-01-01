'use client';

import { useState, useEffect } from 'react';
import { resultsApi } from '@/lib/api';
import TestDetailModal from './TestDetailModal';

interface TestsTabProps {
  studentId: string;
}

export default function TestsTab({ studentId }: TestsTabProps) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedResult, setSelectedResult] = useState<any>(null);

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const response = await resultsApi.getByStudent(studentId);
      setResults(response.data);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch test results');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (error) {
    return <div className="error">{error}</div>;
  }

  return (
    <div>
      {results.length === 0 ? (
        <p>No test results found</p>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Test Name</th>
              <th>Date</th>
              <th>Score</th>
              <th>Percentage</th>
              <th>Rank</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {results.map((result) => (
              <tr key={result._id}>
                <td>{result.testId?.testName || 'N/A'}</td>
                <td>
                  {result.testId?.testDate
                    ? new Date(result.testId.testDate).toLocaleDateString()
                    : 'N/A'}
                </td>
                <td>{result.totals?.totalScore || 0}</td>
                <td>{result.totals?.percentage?.toFixed(2) || 0}%</td>
                <td>{result.totals?.rank || 'N/A'}</td>
                <td>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    onClick={() => setSelectedResult(result)}
                  >
                    View Details
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selectedResult && (
        <TestDetailModal
          result={selectedResult}
          onClose={() => setSelectedResult(null)}
          onUpdate={fetchResults}
        />
      )}
    </div>
  );
}

