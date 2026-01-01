'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import api from '@/lib/api';

export default function ConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const testConnection = async () => {
    setTesting(true);
    setResult(null);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';
      console.log('Testing connection to:', apiUrl);
      
      const response = await api.get('/health');
      setResult({
        success: true,
        message: `✅ Connected! Backend on port ${response.data.port || '5001'}, DB: ${response.data.database}`
      });
    } catch (err: any) {
      console.error('Connection test error:', err);
      let errorMsg = 'Connection failed. ';
      
      if (err.code === 'ECONNREFUSED' || err.message?.includes('Network Error')) {
        errorMsg += 'Backend not reachable. Check: 1) Backend running? 2) Port 5001? 3) Firewall?';
      } else if (err.response) {
        errorMsg += `Server responded with: ${err.response.status} ${err.response.statusText}`;
      } else {
        errorMsg += err.message || 'Unknown error';
      }
      
      setResult({
        success: false,
        message: errorMsg
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Backend Connection</p>
            {result && (
              <p className={`text-xs mt-1 ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                {result.message}
              </p>
            )}
          </div>
          <Button onClick={testConnection} disabled={testing} size="sm">
            {testing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

