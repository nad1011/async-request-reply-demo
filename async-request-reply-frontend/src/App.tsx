// src/App.tsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Step {
  timestamp: string;
  message: string;
  details?: string;
}

const App: React.FC = () => {
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const addStep = (message: string, details?: string) => {
    setSteps(prevSteps => [...prevSteps, {
      timestamp: new Date().toISOString(),
      message,
      details
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSteps([]);
    setCorrelationId(null);

    try {
      addStep('Sending request to server');
      const response = await axios.post('http://localhost:3001/api/request', { message });
      addStep('Received response from server', `Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 202) {
        setCorrelationId(response.data.correlationId);
        addStep('Request accepted for processing', `Correlation ID: ${response.data.correlationId}`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      addStep('Error occurred', error.message);
    }

    setLoading(false);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (correlationId) {
      intervalId = setInterval(async () => {
        try {
          const response = await axios.get(`http://localhost:3001/api/status/${correlationId}`);
          addStep('Checked request status', `Status: ${response.data.status}`);

          if (response.data.status === 'Completed') {
            clearInterval(intervalId);
            addStep('Processing completed', `Result: ${response.data.result}`);
          }
        } catch (error: any) {
          console.error('Error checking status:', error);
          addStep('Error checking status', error.message);
          clearInterval(intervalId);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [correlationId]);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Asynchronous Request-Reply Demo</h1>
      <form onSubmit={handleSubmit} className="mb-4">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Enter a message"
          className="border p-2 mr-2"
        />
        <button type="submit" className="bg-blue-500 text-white p-2 rounded" disabled={loading}>
          {loading ? 'Sending...' : 'Send Request'}
        </button>
      </form>
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Process Steps:</h2>
        {steps.map((step, index) => (
          <div key={index} className="mb-2">
            <p className="font-medium">{step.timestamp} - {step.message}</p>
            {step.details && <p className="text-sm text-gray-600 ml-4">{step.details}</p>}
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;