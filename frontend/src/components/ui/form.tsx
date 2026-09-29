// shadcn/ui's React Hook Form composition, using the project's Label primitive.
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import {
  Controller, FormProvider, useFormContext, useFormState,
  type ControllerProps, type FieldPath, type FieldValues,
} from "react-hook-form";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";

const Form = FormProvider;
const FormFieldContext = React.createContext<{ name: string } | null>(null);
const FormItemContext = React.createContext<{ id: string } | null>(null);

function FormField<TValues extends FieldValues, TName extends FieldPath<TValues>>(
  props: ControllerProps<TValues, TName>,
) {
  return <FormFieldContext value={{ name: props.name }}><Controller {...props} /></FormFieldContext>;
}

function useFormField() {
  const field = React.useContext(FormFieldContext);
  const item = React.useContext(FormItemContext);
  const { getFieldState } = useFormContext();
  const state = useFormState({ name: field?.name });
  if (!field || !item) throw new Error("Form controls must be inside FormField and FormItem.");
  return {
    name: field.name,
    formItemId: `${item.id}-form-item`,
    formDescriptionId: `${item.id}-form-description`,
    formMessageId: `${item.id}-form-message`,
    ...getFieldState(field.name, state),
  };
}

function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId();
  return <FormItemContext value={{ id }}><div data-slot="form-item" className={cn("grid gap-2", className)} {...props} /></FormItemContext>;
}

function FormLabel({ className, ...props }: React.ComponentProps<typeof Label>) {
  const { error, formItemId } = useFormField();
  return <Label data-slot="form-label" data-error={!!error} htmlFor={formItemId} className={cn("data-[error=true]:text-destructive", className)} {...props} />;
}

function FormControl(props: React.ComponentProps<typeof Slot>) {
  const { error, formItemId, formDescriptionId, formMessageId } = useFormField();
  return <Slot data-slot="form-control" id={formItemId} aria-describedby={error ? `${formDescriptionId} ${formMessageId}` : formDescriptionId} aria-invalid={!!error} {...props} />;
}

function FormDescription({ className, ...props }: React.ComponentProps<"p">) {
  const { formDescriptionId } = useFormField();
  return <p data-slot="form-description" id={formDescriptionId} className={cn("text-sm text-muted-foreground", className)} {...props} />;
}

function FormMessage({ className, children, ...props }: React.ComponentProps<"p">) {
  const { error, formMessageId } = useFormField();
  const body = error ? String(error.message ?? "") : children;
  if (!body) return null;
  return <p data-slot="form-message" id={formMessageId} className={cn("text-sm text-destructive", className)} {...props}>{body}</p>;
}

export { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage };
