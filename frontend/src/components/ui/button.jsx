// src/components/ui/button.jsx
export const Button = ({ children, className = "", ...props }) => {
    return (
      <button
        className={`px-3 py-1 rounded border text-sm hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  };
  