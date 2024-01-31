import { cn } from "@/lib/utils";
import React from "react";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn("w-full", className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "InputCell";

export interface InputCellProps {
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
}

export const InputCell = ({
  value: initialValue,
  onChange,
  isRequired,
}: InputCellProps) => {
  const [value, setValue] = React.useState<string>(initialValue);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  const handleSubmit = () => {
    if (isRequired && !value) {
      setValue(initialValue);
      return;
    }
    if (inputRef.current) {
      inputRef.current.blur();
    }
    onChange(value);
  };

  const onBlur = () => {
    handleSubmit();
  };
  const onKeyUp = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.code === "Enter") {
      if (inputRef.current) {
        inputRef.current.blur();
      }
    }
  };

  return (
    <Input
      ref={inputRef}
      onBlur={onBlur}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
      }}
      onKeyUp={onKeyUp}
    />
  );
};
