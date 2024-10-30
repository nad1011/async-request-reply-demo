import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface Step {
  timestamp: string;
  message: string;
  details?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const App: React.FC = () => {
  const [message, setMessage] = useState('');
  const [steps, setSteps] = useState<Step[]>([]);
  const [correlationId, setCorrelationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [statusCheckCount, setStatusCheckCount] = useState(0);

  const addStep = (message: string, status: Step['status'], details?: string) => {
    setSteps(prevSteps => [...prevSteps, {
      timestamp: new Date().toISOString(),
      message,
      status,
      details
    }]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSteps([]);
    setCorrelationId(null);
    setImageUrl(null);
    setStatusCheckCount(0);

    try {
      addStep('Sending search request to server', 'pending');
      const response = await axios.post('http://localhost:3001/api/request', { message });
      addStep('Received response from server', 'completed', 
        `Status: ${response.status} ${response.statusText}`);
      
      if (response.status === 202) {
        setCorrelationId(response.data.correlationId);
        addStep('Search request accepted', 'processing', 
          `Correlation ID: ${response.data.correlationId}`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      addStep('Error occurred', 'error', error.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    
    if (correlationId) {
      intervalId = setInterval(async () => {
        try {
          setStatusCheckCount(prev => prev + 1);
          const response = await axios.get(`http://localhost:3001/api/status/${correlationId}`);
          
          // Add a status check step
          addStep(
            `Status Check #${statusCheckCount + 1}`, 
            response.data.status === 'Completed' ? 'completed' : 'processing',
            `Current Status: ${response.data.status}`
          );
          
          if (response.data.status === 'Completed') {
            clearInterval(intervalId);
            setLoading(false);
            setCorrelationId(null);
            
            if (response.data.result.startsWith('Error:')) {
              addStep('Search failed', 'error', response.data.result);
            } else {
              addStep('Image found', 'completed', response.data.result);
              setImageUrl(response.data.result);
            }
          } else {  
            const pendingDetails = `Time elapsed: ${new Date().getMilliseconds()} ms`;
            addStep('Request still processing', 'pending', pendingDetails);
          }
        } catch (error: any) {
          console.error('Error checking status:', error);
          addStep('Error checking status', 'error', error.message);
          clearInterval(intervalId);
          setLoading(false);
          setCorrelationId(null);
        }
      }, 200);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [correlationId, statusCheckCount]);

  const getStatusColor = (status: Step['status']) => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'processing':
        return 'text-blue-600 bg-blue-100';
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'error':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6">Image Search Demo</h1>
        
        <form onSubmit={handleSubmit} className="mb-6">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter search term"
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button 
              type="submit" 
              className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              disabled={loading || !message.trim()}
            >
              {loading ? 'Searching...' : 'Search Image'}
            </button>
          </div>
        </form>

        {loading && (
          <div className="flex items-center justify-center p-4 mb-6 bg-blue-50 rounded-lg">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
            <span className="text-blue-500">Processing request... ({statusCheckCount} status checks)</span>
          </div>
        )}

        {imageUrl && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Search Result:</h2>
            <div className="border rounded-lg p-2 bg-gray-50">
              <img 
                src={imageUrl} 
                alt="Search result" 
                className="max-w-full h-auto rounded-lg shadow-lg"
              />
            </div>
          </div>
        )}

        <div className="mt-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Process Steps:</h2>
            {loading && (
              <span className="text-sm text-blue-500">
                Checking status every 2 seconds
              </span>
            )}
          </div>
          <div className="border rounded-lg divide-y">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`p-4 ${getStatusColor(step.status)} transition-colors duration-200`}
              >
                <p className="font-medium">{step.message}</p>
                <p className="text-sm opacity-75">
                  {new Date(step.timestamp).toLocaleTimeString()}
                </p>
                {step.details && (
                  <p className="text-sm mt-1 opacity-90">{step.details}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;