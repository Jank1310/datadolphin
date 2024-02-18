import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
} from "@/components/ui/select";
import { useFrontendFetchWithAuth } from "@/lib/frontendFetch";
import { cn } from "@/lib/utils";
import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import React, { useId } from "react";
import { useTranslation } from "react-i18next";
import { NewValueDialog } from "../NewValueDialog";

type Props = {
  value: string;
  onChange: (value: string) => void;
  isRequired: boolean;
  availableValues: string[];
  isReadOnly: boolean;
  configKey: string;
  importerId: string;
  onReloadConfig: VoidFunction;
  allowAddNewValue?: boolean;
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
    <span>{children}</span>
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
  configKey,
  importerId,
  onReloadConfig,
  allowAddNewValue,
}: Props) => {
  const { t } = useTranslation();
  const id = useId();
  const frontendFetch = useFrontendFetchWithAuth();
  const [value, setValue] = React.useState<string>(initialValue);
  const [dialogOpen, setDialogOpen] = React.useState<boolean>(false);

  React.useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleDialogSave = async (value: string) => {
    if (!value) {
      setDialogOpen(false);
      return;
    }
    // use settimeout to get a snappier experience
    setTimeout(() => onChange(value));
    setValue(value);
    await frontendFetch(
      `/api/importer/${importerId}/columnConfig/${configKey}/validations`,
      {
        method: "PATCH",
        body: JSON.stringify({
          type: "enum",

          values: [...new Set([...availableValues, value])],
        }),
      }
    );
    onReloadConfig();
    setDialogOpen(false);
  };

  return (
    <>
      <Select
        disabled={isReadOnly}
        value={(value as string) ?? ""}
        onValueChange={(newValue) => {
          if (value !== newValue) {
            if (newValue === "$$new") {
              setDialogOpen(true);
              return;
            }
            // use settimeout to get a snappier experience
            setTimeout(() => onChange(newValue));
          }
          setValue(newValue);
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
          <SelectSeparator />
          {allowAddNewValue && (
            <SelectItem value="$$new" key={`enum-value-${id}-new`}>
              {t("validation.selectCellAddNewValue")}
            </SelectItem>
          )}
        </SelectContent>
      </Select>
      <NewValueDialog dialogOpen={dialogOpen} onSave={handleDialogSave} />
    </>
  );
};

export default SelectCell;
