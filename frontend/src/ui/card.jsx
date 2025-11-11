export function Card({ children, className = "", ...props }) {
    return (
      <div
        className={`bg-card text-card-foreground flex flex-col gap-6 rounded-xl border shadow ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
  
  export function CardHeader({ children, className = "" }) {
    return <div className={`px-6 pt-6 mb-2 ${className}`}>{children}</div>;
  }
  
  export function CardTitle({ children, className = "" }) {
    return <h2 className={`text-xl font-semibold leading-none ${className}`}>{children}</h2>;
  }
  
  export function CardContent({ children, className = "" }) {
    return <div className={`px-6 pb-6 space-y-4 ${className}`}>{children}</div>;
  }
  