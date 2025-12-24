import clsx from "clsx";

interface StepsProps {
  children: React.ReactNode;
}

interface StepProps {
  title: string;
  children: React.ReactNode;
}

export function Steps({ children }: StepsProps) {
  return (
    <div className="my-8 ml-4 border-l-2 border-kb-border-tertiary pl-6 space-y-8">
      {children}
    </div>
  );
}

export function Step({ title, children }: StepProps) {
  return (
    <div className="relative">
      {/* Step indicator */}
      <div className="absolute -left-[31px] top-0 flex items-center justify-center w-5 h-5 rounded-full bg-kb-surface-tertiary border-2 border-kb-border-tertiary">
        <div className="w-2 h-2 rounded-full bg-kb-content-brand" />
      </div>

      {/* Step content */}
      <div>
        <h4 className="font-semibold text-kb-content-primary mb-2">{title}</h4>
        <div className="text-kb-content-secondary [&>p]:mb-2 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
