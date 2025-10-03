export function Button({ children, className = "", ...props }) {
    return (
      <button
        className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
  