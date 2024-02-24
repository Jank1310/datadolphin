import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import React, { useId } from "react";
import { useTranslation } from "react-i18next";

type Props = {
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
  availableValues: string[];
  isReadOnly: boolean;
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
  value: initialValue,
  onChange,
  isRequired,
  availableValues,
  isReadOnly,
}: Props) => {
  const { t } = useTranslation();
  const id = useId();
  const [value, setValue] = React.useState<string>(initialValue);
  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);
  const normalizedString = (value as string) ?? "";
  const isValueEmpty = normalizedString === "";
  return (
    <Select
      disabled={isReadOnly}
      value={normalizedString === "" ? "none" : normalizedString}
      onValueChange={(newValue) => {
        const normalizedNewValue = newValue === "none" ? "" : newValue;
        if (value !== normalizedNewValue) {
          // use settimeout to get a snappier experience
          setTimeout(() => onChange(normalizedNewValue));
        }
        setValue(newValue);
      }}
    >
      <SelectCellTrigger
        className={cn({
          "text-gray-400": isValueEmpty,
        })}
      >
        {isValueEmpty ? t("validation.none") : value}
      </SelectCellTrigger>
      <SelectContent>
        {!isRequired && (
          <SelectItem className="text-gray-400" value={"none"}>
            {t("validation.none")}
          </SelectItem>
        )}
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
