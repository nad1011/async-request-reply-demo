import { useEffect, useRef } from "react";

interface Step {
  timestamp: string;
  message: string;
  details?: string;
  status: "pending" | "processing" | "completed" | "error";
}

interface StepsSectionProps {
  steps: Step[];
  getStatusIcon: (status: Step["status"]) => JSX.Element | null;
}

const StepsSection: React.FC<StepsSectionProps> = ({
  steps,
  getStatusIcon,
}) => {
  const stepsContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (stepsContainerRef.current) {
      stepsContainerRef.current.scrollTop =
        stepsContainerRef.current.scrollHeight;
    }
  }, [steps]);

  return (
    <div
      ref={stepsContainerRef}
      className="border rounded-lg divide-y bg-gray-50 text-gray-800 h-[70vh] overflow-y-scroll scrollbar-custom overflow-x-hidden"
      style={{
        scrollBehavior: "smooth",
        scrollbarWidth: "thin", // For Firefox
        scrollbarColor: "rgba(0,0,0,0.3) transparent", // For Firefox
      }}
    >
      {steps.map((step, index) => (
        <div
          key={index}
          className={`
              p-4 flex items-center gap-2 
              transition-all duration-300 ease-in-out
              transform hover:translate-x-2 hover:bg-gray-100
              animate-fade-in-down
            `}
        >
          <div className="animate-rotate-in">{getStatusIcon(step.status)}</div>
          <div className="flex-grow">
            <p className="font-medium text-gray-800 transition-colors">
              {step.message}
            </p>
            <p className="text-sm opacity-75 text-gray-600">
              {new Date(step.timestamp).toLocaleTimeString()}
            </p>
            {step.details && (
              <p className="text-sm mt-1 opacity-90 text-gray-700 italic">
                {step.details}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default StepsSection;
