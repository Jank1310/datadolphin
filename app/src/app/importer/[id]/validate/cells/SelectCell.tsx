import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import React, { useId } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
  availableValues: string[];
};

const SelectCellTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex w-full items-center justify-between text-sm",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
));
SelectCellTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectCell = ({
  value,
  onChange,
  isRequired,
  availableValues,
}: Props) => {
  const id = useId();
  return (
    <Select
      value={(value as string) ?? ""}
      onValueChange={(newValue) => {
        if (value !== newValue) {
          onChange(newValue);
        }
      }}
    >
      <SelectCellTrigger className="">{value}</SelectCellTrigger>
      <SelectContent>
        {!isRequired && <SelectItem value={"none"}>None</SelectItem>}
        {availableValues.map((selectableValue) => (
          <SelectItem
            value={selectableValue}
            key={`enum-value-${id}-${selectableValue}`}
          >
            {selectableValue}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default SelectCell;
