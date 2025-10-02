export function Input({ className = "", ...props }) {
    return (
      <input
        className={`flex h-9 w-full rounded-md border border-input bg-input-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
    );
  }
  