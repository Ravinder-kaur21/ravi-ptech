import * as React from "react"
import { FormProvider, Controller } from "react-hook-form"
import { cn } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Slot } from "@radix-ui/react-slot"

const Form = FormProvider

type FormFieldContextValue = {
  name: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: any
}

type FormItemContextValue = {
  id: string
}

const FormFieldContext = React.createContext<FormFieldContextValue>(
  {} as FormFieldContextValue,
)
const FormItemContext = React.createContext<FormItemContextValue>(
  {} as FormItemContextValue,
)

const FormField = React.forwardRef<
  HTMLDivElement,
  {
    name: string
    render: (props: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      field: any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fieldState: any
    }) => React.ReactNode
  }
>(({ name, render, ...props }, _ref) => (
  <FormFieldContext.Provider value={{ name }}>
    <FormItemContext.Provider
      value={{
        id: React.useId(),
      }}
    >
      <Controller
        name={name}
        render={({ field, fieldState }) => {
          const contextValue = {
            name,
            error: fieldState.error,
          }
          return (
            <FormFieldContext.Provider value={contextValue}>
              {render({ field, fieldState })}
            </FormFieldContext.Provider>
          )
        }}
      />
    </FormItemContext.Provider>
  </FormFieldContext.Provider>
))
FormField.displayName = "FormField"

const FormItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("space-y-2", className)}
    {...props}
  />
))
FormItem.displayName = "FormItem"

const FormLabel = React.forwardRef<
  React.ElementRef<typeof Label>,
  React.ComponentPropsWithoutRef<typeof Label>
>(({ className, ...props }, ref) => (
  <Label ref={ref} className={cn(className)} {...props} />
))
FormLabel.displayName = "FormLabel"

const FormControl = React.forwardRef<
  React.ElementRef<typeof Slot>,
  React.ComponentPropsWithoutRef<typeof Slot>
>(({ className, ...props }, ref) => {
  const { id } = React.useContext(FormItemContext)
  const { error } = React.useContext(FormFieldContext)
  return (
    <Slot
      ref={ref}
      id={id}
      className={cn("mt-1", className)}
      aria-invalid={!!error}
      aria-describedby={`${id}-form-item-message`}
      {...props}
    />
  )
})
FormControl.displayName = "FormControl"

const FormDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
FormDescription.displayName = "FormDescription"

const FormMessage = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, children, ...props }, ref) => {
  const { error } = React.useContext(FormFieldContext)
  const body = error ? String(error.message || "") : children
  return (
    <p
      ref={ref}
      className={cn(
        "text-sm font-medium text-destructive",
        !body && "hidden",
        className,
      )}
      {...props}
    >
      {body}
    </p>
  )
})
FormMessage.displayName = "FormMessage"

export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
}
