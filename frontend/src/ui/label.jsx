export function Label({ children, className = "", ...props }) {
    return (
      <label
        className={`block text-sm font-medium text-foreground leading-none ${className}`}
        {...props}
      >
        {children}
      </label>
    );
  }
  