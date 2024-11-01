import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle, RotateCcw, AlertCircle } from 'lucide-react';
import StepsSection from './StepSection';

interface Step {
  timestamp: string;
  message: string;
  details?: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
}

const customStyles = `
  @keyframes fadeInDown {
    from {
      opacity: 0;
      transform: translateY(-20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes rotateIn {
    from {
      transform: rotate(-180deg) scale(0);
      opacity: 0;
    }
    to {
      transform: rotate(0) scale(1);
      opacity: 1;
    }
  }

  .scrollbar-custom::-webkit-scrollbar {
    width: 8px;
  }

  .scrollbar-custom::-webkit-scrollbar-track {
    background: transparent;
  }

  .scrollbar-custom::-webkit-scrollbar-thumb {
    background-color: rgba(0,0,0,0.2);
    border-radius: 4px;
  }

  .scrollbar-custom::-webkit-scrollbar-thumb:hover {
    background-color: rgba(0,0,0,0.4);
  }

  .animate-fade-in-down {
    animation: fadeInDown 0.3s ease-out;
  }

  .animate-rotate-in {
    animation: rotateIn 0.4s cubic-bezier(0.25, 0.1, 0.25, 1);
  }
`;

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
              addStep('Image found', 'completed', 'See result below');
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

  const getStatusIcon = (status: Step['status']) => {
    switch (status) {
      case 'pending':
        return <RotateCcw size={18} className="text-yellow-500" />;
      case 'processing':
        return <RotateCcw size={18} className="text-blue-500" />;
      case 'completed':
        return <CheckCircle size={18} className="text-green-500" />;
      case 'error':
        return <AlertCircle size={18} className="text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-4 items-center justify-center p-4 w-full h-[100vh]">
      <div className="relative bg-white rounded-lg p-4 w-1/2">
        <form onSubmit={handleSubmit} className="">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter search term"
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800"
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
      </div>

      <div className="bg-white rounded-lg p-6 flex flex-row gap-4 w-[80vw]">
        <div className="basis-1/2">
          <h2 className="text-xl font-semibold mb-4">Process Steps:</h2>
          <StepsSection steps={steps} getStatusIcon={getStatusIcon} />
          <style>{customStyles}</style>
        </div>

        <div className="basis-1/2 h-[70vh]">
          <h2 className="text-xl font-semibold mb-4">Search Result:</h2>
          {loading && (
            <div className="flex items-center justify-center p-4 mb-6 bg-blue-50 rounded-lg">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mr-3"></div>
              <span className="text-blue-500">Processing request... ({statusCheckCount} status checks)</span>
            </div>
          )}

          {imageUrl && (
            <div className="h-full">
              <div className="border rounded-lg p-2 bg-gray-50 h-full">
                <img
                  src={imageUrl}
                  alt="Search result"
                  className="rounded-lg shadow-lg h-full w-full object-fill"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;