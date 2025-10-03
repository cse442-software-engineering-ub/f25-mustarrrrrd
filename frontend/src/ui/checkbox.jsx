export function Checkbox({ checked, onChange, className = "", ...props }) {
    return (
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={`h-4 w-4 rounded border border-border bg-input-background text-primary focus:ring-2 focus:ring-ring ${className}`}
        {...props}
      />
    );
  }
  