import * as React from "react"
import { cn } from "@/lib/utils"

interface CollapsibleProps {
  children: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const Collapsible: React.FC<CollapsibleProps> = ({ 
  children, 
  open = false, 
  onOpenChange,
  className 
}) => {
  const [isOpen, setIsOpen] = React.useState(open);

  React.useEffect(() => {
    setIsOpen(open);
  }, [open]);

  const handleToggle = () => {
    const newOpen = !isOpen;
    setIsOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  return (
    <div className={cn("space-y-2", className)} data-state={isOpen ? "open" : "closed"}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          if (child.type === CollapsibleTrigger) {
            return React.cloneElement(child as React.ReactElement<any>, {
              onClick: handleToggle,
              "data-state": isOpen ? "open" : "closed"
            });
          }
          if (child.type === CollapsibleContent) {
            return isOpen ? child : null;
          }
        }
        return child;
      })}
    </div>
  );
};

const CollapsibleTrigger: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children, 
  onClick,
  className,
  ...props 
}) => (
  <div
    className={cn("cursor-pointer", className)}
    onClick={onClick}
    {...props}
  >
    {children}
  </div>
);

const CollapsibleContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ 
  children,
  className,
  ...props 
}) => (
  <div 
    className={cn("animate-in slide-in-from-top-1 duration-200", className)}
    {...props}
  >
    {children}
  </div>
);

export { Collapsible, CollapsibleTrigger, CollapsibleContent }