import type { FormEventHandler, ReactNode } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type SettingsFormCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
  saving: boolean;
  dirty: boolean;
  feedback?: { kind: "success" | "error"; message: string } | null;
};

export function SettingsFormCard({
  title,
  description,
  children,
  onSubmit,
  saving,
  dirty,
  feedback,
}: SettingsFormCardProps) {
  return <Card className="settings-form-card">
    <CardHeader className="settings-card-header">
      <CardTitle role="heading" aria-level={2}>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <form className="settings-form" noValidate onSubmit={onSubmit}>
      <CardContent className="settings-form-content">{children}</CardContent>
      <div className="settings-form-footer">
        <div className="settings-form-feedback" aria-live="polite">
          {feedback && <p className={feedback.kind === "error" ? "is-error" : "is-success"} role={feedback.kind === "error" ? "alert" : "status"}>{feedback.message}</p>}
        </div>
        <Button className="admin-primary-button settings-save-button" type="submit" disabled={saving || !dirty}>
          {saving && <LoaderCircle aria-hidden="true" className="animate-spin" />}
          {saving ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  </Card>;
}
