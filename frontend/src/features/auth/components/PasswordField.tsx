import { useState, type ComponentProps } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type PasswordFieldProps = ComponentProps<typeof Input> & { label?: string };

export function PasswordField({
  className,
  label = "password",
  disabled,
  ...props
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="auth-input-wrap">
      <LockKeyhole className="auth-field-icon" aria-hidden="true" />
      <Input
        {...props}
        disabled={disabled}
        type={visible ? "text" : "password"}
        className={cn(
          "auth-input auth-input-with-icon auth-password-input",
          className,
        )}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="auth-password-toggle"
        aria-label={`${visible ? "Hide" : "Show"} ${label}`}
        aria-pressed={visible}
        aria-controls={props.id}
        disabled={disabled}
        onClick={() => setVisible((current) => !current)}
      >
        {visible ? <Eye aria-hidden="true" /> : <EyeOff aria-hidden="true" />}
      </Button>
    </div>
  );
}
