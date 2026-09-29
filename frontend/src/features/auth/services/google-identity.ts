export type GoogleCredentialResponse = { credential: string };
export type GoogleIdentity = {
  initialize: (options: { client_id: string; callback: (response: GoogleCredentialResponse) => void; auto_select: boolean }) => void;
  renderButton: (parent: HTMLElement, options: {
    type: "standard"; theme: "outline"; size: "large"; text: "continue_with";
    shape: "rectangular"; width: number; logo_alignment: "center";
  }) => void;
};

declare global {
  interface Window { google?: { accounts: { id: GoogleIdentity } } }
}

let loading: Promise<GoogleIdentity> | undefined;

export function loadGoogleIdentity(): Promise<GoogleIdentity> {
  if (window.google?.accounts.id) return Promise.resolve(window.google.accounts.id);
  if (loading) return loading;
  loading = new Promise<GoogleIdentity>((resolve, reject) => {
    const existing = document.getElementById("occup-google-identity");
    existing?.remove();
    const script = document.createElement("script");
    script.id = "occup-google-identity";
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    const timeout = window.setTimeout(() => finish(false), 15000);
    function finish(success: boolean) {
      window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (success && window.google?.accounts.id) resolve(window.google.accounts.id);
      else { script.remove(); reject(new Error("Google sign-in could not load.")); }
    }
    script.onload = () => finish(true);
    script.onerror = () => finish(false);
    document.head.appendChild(script);
  }).catch((error: unknown) => { loading = undefined; throw error; });
  return loading;
}
