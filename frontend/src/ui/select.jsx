export function Select({ value, onChange, children, className = "" }) {
    return (
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full h-9 rounded-md border border-border bg-input-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring ${className}`}
      >
        {children}
      </select>
    );
  }
  
  export function SelectOption({ value, children }) {
    return <option value={value}>{children}</option>;
  }
  