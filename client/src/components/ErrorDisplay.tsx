import { AlertCircle } from "lucide-react";

interface ErrorDisplayProps {
  error: string;
  onDismiss: () => void;
}

export default function ErrorDisplay({ error, onDismiss }: ErrorDisplayProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-8">
      <div className="flex">
        <AlertCircle className="text-red-500 w-5 h-5 mr-2 mt-0.5" />
        <div>
          <h3 className="font-medium text-red-800 mb-1">Error</h3>
          <p className="text-red-700 text-sm">{error}</p>
          <button 
            className="text-red-800 hover:text-red-900 text-sm font-medium mt-2 flex items-center" 
            onClick={onDismiss}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
