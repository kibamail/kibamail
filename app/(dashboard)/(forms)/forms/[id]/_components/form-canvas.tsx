"use client";

export function FormCanvas() {
  return (
    <div className="w-full h-full bg-kb-background-secondary flex items-center justify-center">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-6xl">📋</div>
        <h2 className="text-xl font-semibold text-kb-content-primary">
          Form Builder Canvas
        </h2>
        <p className="text-sm text-kb-content-tertiary">
          Drag and drop fields from the sidebar to build your form. The form
          builder interface will be implemented here.
        </p>
      </div>
    </div>
  );
}
