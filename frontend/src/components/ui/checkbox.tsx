import * as React from "react"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, onCheckedChange, onChange, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <div className="relative">
        <input
          type="checkbox"
          ref={ref}
          className={cn(
            "peer h-4 w-4 shrink-0 rounded-sm border border-gray-300 bg-white checked:bg-blue-600 checked:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-blue-500 dark:checked:border-blue-500",
            className
          )}
          onChange={handleChange}
          {...props}
        />
        {props.checked && (
          <Check className="absolute top-0 left-0 h-4 w-4 text-white pointer-events-none" />
        )}
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export { Checkbox }