import { ImagePlus, Music, Settings, Film } from "lucide-react";

interface StepperProps {
  currentStep: number;
}

export default function Stepper({ currentStep }: StepperProps) {
  const steps = [
    { icon: <ImagePlus size={18} />, label: "Subir Fotos" },
    { icon: <Music size={18} />, label: "Generar Audio" },
    { icon: <Settings size={18} />, label: "Configurar Video" },
    { icon: <Film size={18} />, label: "Generar Video" }
  ];

  return (
    <div className="mb-8">
      <div className="flex flex-wrap md:flex-nowrap justify-between items-center">
        {steps.map((step, index) => (
          <div key={index} className="step-item flex-1 flex flex-col items-center">
            <div 
              className={`w-10 h-10 rounded-full ${
                index <= currentStep ? 'bg-primary text-white' : 'bg-gray-300 text-gray-700'
              } flex items-center justify-center mb-2`}
            >
              {step.icon}
            </div>
            <span className={`text-sm font-medium ${
              index <= currentStep ? '' : 'text-gray-500'
            }`}>
              {step.label}
            </span>
            <div 
              className={`w-full h-1 ${
                index <= currentStep - 1 ? 'bg-primary' : 'bg-gray-300'
              } mt-2 rounded`}
            ></div>
          </div>
        ))}
      </div>
    </div>
  );
}
