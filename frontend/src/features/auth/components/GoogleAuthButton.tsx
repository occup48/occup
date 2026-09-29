import { useEffect, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import google from "@/assets/icons/google.svg";
import { loadGoogleIdentity } from "../services/google-identity";

type GoogleAuthButtonProps = {
  disabled: boolean;
  loading: boolean;
  onCredential: (credential: string) => void;
};

export function GoogleAuthButton({
  disabled,
  loading,
  onCredential,
}: GoogleAuthButtonProps) {
  const container = useRef<HTMLDivElement>(null);
  const callback = useRef(onCredential);
  const disabledRef = useRef(disabled);
  const [status, setStatus] = useState<"loading" | "ready" | "failed">(
    "loading",
  );
  const [attempt, setAttempt] = useState(0);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();

  useEffect(() => {
    callback.current = onCredential;
    disabledRef.current = disabled;
  }, [onCredential, disabled]);

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    const host = container.current;
    loadGoogleIdentity()
      .then((identity) => {
        if (cancelled || !host) return;
        identity.initialize({
          client_id: clientId,
          auto_select: false,
          callback: ({ credential }) => {
            if (!cancelled && !disabledRef.current && credential)
              callback.current(credential);
          },
        });
        let previousWidth = 0;
        function render() {
          if (cancelled || !host) return;
          const width = Math.max(
            200,
            Math.min(400, Math.floor(host.getBoundingClientRect().width)),
          );
          if (width === previousWidth) return;
          previousWidth = width;
          host.replaceChildren();
          identity.renderButton(host, {
            type: "standard",
            theme: "outline",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
            width,
            logo_alignment: "center",
          });
        }
        render();
        observer = new ResizeObserver(render);
        observer.observe(host);
        setStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setStatus("failed");
      });
    return () => {
      cancelled = true;
      observer?.disconnect();
      host?.replaceChildren();
    };
  }, [clientId, attempt]);

  const ready = Boolean(clientId) && status === "ready";
  return (
    <div className="auth-google">
      <div
        ref={container}
        className="auth-google-provider"
        hidden={!ready || loading}
        inert={disabled}
        aria-label="Continue with Google"
      />
      {(!ready || loading) && (
        <Button
          type="button"
          variant="outline"
          className="auth-google-button"
          disabled={disabled || !clientId || status === "loading"}
          onClick={() => {
            setStatus("loading");
            setAttempt((value) => value + 1);
          }}
        >
          {loading ? (
            <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
          ) : (
            <img src={google} alt="" aria-hidden="true" className="size-6" />
          )}
          {loading
            ? "Signing in with Google..."
            : status === "failed"
              ? "Retry Google sign-in"
              : "Continue with Google"}
        </Button>
      )}
      {(!clientId || status === "failed") && (
        <p className="auth-google-note" role="status">
          Google sign-in is temporarily unavailable. You can continue with
          email.
        </p>
      )}
    </div>
  );
}
