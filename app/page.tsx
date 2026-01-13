'use client';

import { useEffect, useState } from 'react';
import { account } from '../lib/appwriteClient';

export default function TestAppwrite() {
  const [status, setStatus] = useState('Pinging Appwrite...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function ping() {
      try {
        // Attempt to get the currently logged-in user
        const user = await account.get();
        setStatus(`✅ Connected! Logged in as: ${user.email}`);
        setError(null);
      } catch (err: any) {
        console.error('Appwrite connection error:', err);

        // If error is 401, it means connection works but no user is logged in
        if (err.code === 401) {
          setStatus('✅ Connected to Appwrite! No user logged in yet.');
          setError(null);
        } else {
          setStatus('❌ Failed to connect to Appwrite');
          setError(err.message || 'Unknown error');
        }
      }
    }

    ping();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-4 text-center">
          Appwrite Connection Test
        </h1>
        <div className="space-y-2">
          <p className="text-lg">{status}</p>
          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
              <p className="text-sm text-red-600">Error: {error}</p>
            </div>
          )}
        </div>
        <div className="mt-6 text-sm text-gray-600">
          <p>Next steps:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Create authentication UI</li>
            <li>Set up database collections</li>
            <li>Build user registration flow</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
