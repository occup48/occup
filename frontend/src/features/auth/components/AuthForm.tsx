import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CircleAlert, CircleCheck, LoaderCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useAuth } from "../auth.context";
import { authService, getAuthError } from "../services/auth.service";
import { getAuthSchema, signUpSchema } from "../validation/auth.schema";
import type { AuthFormValues, AuthMode, AuthSession } from "../types/auth";
import { GoogleAuthButton } from "./GoogleAuthButton";
import { PasswordField } from "./PasswordField";

type AuthRouteState = {
  accountCreated?: boolean;
  email?: string;
  from?: string;
};

export function AuthForm({ mode }: { mode: AuthMode }) {
  const isSignIn = mode === "signin";
  const navigate = useNavigate();
  const location = useLocation();
  const routeState = location.state as AuthRouteState | null;
  const { authenticate } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);
  const requestController = useRef<AbortController | null>(null);
  const submitting = useRef(false);
  const form = useForm<AuthFormValues>({
    resolver: zodResolver(getAuthSchema(mode)),
    defaultValues: {
      email: typeof routeState?.email === "string" ? routeState.email : "",
      password: "",
      firstName: "",
      lastName: "",
      confirmPassword: "",
      rememberMe: true,
    },
    mode: "onTouched",
  });
  const busy = form.formState.isSubmitting || googleLoading;
  const serverError = form.formState.errors.root?.server?.message;

  useEffect(
    () => () => {
      requestController.current?.abort();
    },
    [],
  );

  function completeAuthentication(session: AuthSession, rememberMe: boolean) {
    authenticate(session, rememberMe);
    const from = routeState?.from;
    const destination =
      typeof from === "string" &&
      from.startsWith("/") &&
      !from.startsWith("//") &&
      !from.includes("\\") &&
      !/^\/sign-?(in|up)(?:[/?#]|$)/.test(from)
        ? from
        : "/";
    navigate(destination, { replace: true });
  }

  async function onSubmit(values: AuthFormValues) {
    if (submitting.current) return;
    submitting.current = true;
    form.clearErrors("root");
    const controller = new AbortController();
    requestController.current = controller;
    try {
      if (isSignIn) {
        const session = await authService.signIn(values, controller.signal);
        if (!controller.signal.aborted)
          completeAuthentication(session, Boolean(values.rememberMe));
      } else {
        const signup = signUpSchema.parse(values);
        const result = await authService.signUp(signup, controller.signal);
        if (controller.signal.aborted) return;
        if (result.accessToken) {
          completeAuthentication(
            { user: result.user, accessToken: result.accessToken },
            false,
          );
        } else {
          // This backend creates an account without issuing a session token.
          navigate("/signin", {
            replace: true,
            state: { accountCreated: true, email: signup.email },
          });
        }
      }
    } catch (error) {
      if (!controller.signal.aborted)
        form.setError("root.server", { message: getAuthError(error) });
    } finally {
      submitting.current = false;
    }
  }

  async function onGoogleCredential(credential: string) {
    if (submitting.current) return;
    submitting.current = true;
    setGoogleLoading(true);
    form.clearErrors("root");
    const controller = new AbortController();
    requestController.current = controller;
    try {
      const session = await authService.google(credential, controller.signal);
      if (!controller.signal.aborted)
        completeAuthentication(
          session,
          isSignIn && Boolean(form.getValues("rememberMe")),
        );
    } catch (error) {
      if (!controller.signal.aborted)
        form.setError("root.server", { message: getAuthError(error) });
    } finally {
      submitting.current = false;
      if (!controller.signal.aborted) setGoogleLoading(false);
    }
  }

  return (
    <div className="auth-form-content">
      <header className="auth-form-heading">
        <h1 id="auth-heading" tabIndex={-1}>
          {isSignIn ? "Log in to your account" : "Create your account"}
        </h1>
        <p>
          {isSignIn
            ? "Welcome back! Sign in to continue."
            : "Create an account to start reserving tables."}
        </p>
      </header>

      {isSignIn && routeState?.accountCreated && (
        <div className="auth-feedback auth-feedback-success" role="status">
          <CircleCheck aria-hidden="true" />
          <p>Your account is ready. Sign in to find your next table.</p>
        </div>
      )}
      {serverError && (
        <div className="auth-feedback auth-feedback-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>{serverError}</p>
        </div>
      )}

      <Form {...form}>
        <form
          onSubmit={(event) => {
            void form.handleSubmit(onSubmit)(event);
          }}
          noValidate
          aria-labelledby="auth-heading"
          aria-busy={busy}
        >
          <fieldset disabled={busy} className="auth-fields">
            <legend className="sr-only">
              {isSignIn ? "Sign in details" : "Create account details"}
            </legend>
            {!isSignIn && (
              <div className="auth-name-row">
                {(["firstName", "lastName"] as const).map((name) => (
                  <FormField
                    key={name}
                    control={form.control}
                    name={name}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {name === "firstName" ? "First name" : "Last name"}
                        </FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            className="auth-input"
                            placeholder={
                              name === "firstName" ? "First name" : "Last name"
                            }
                            autoComplete={
                              name === "firstName"
                                ? "given-name"
                                : "family-name"
                            }
                            maxLength={100}
                            required
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                ))}
              </div>
            )}

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <div className="auth-input-wrap">
                    <Mail aria-hidden="true" className="auth-field-icon" />
                    <FormControl>
                      <Input
                        {...field}
                        className="auth-input auth-input-with-icon"
                        type="email"
                        placeholder="Enter your email"
                        autoComplete="email"
                        autoCapitalize="none"
                        spellCheck={false}
                        required
                      />
                    </FormControl>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <PasswordField
                      {...field}
                      placeholder={
                        isSignIn ? "Enter your password" : "Create a password"
                      }
                      autoComplete={
                        isSignIn ? "current-password" : "new-password"
                      }
                      disabled={busy}
                      required
                    />
                  </FormControl>
                  {!isSignIn && (
                    <FormDescription className="auth-password-hint">
                      Use 8+ characters with uppercase and lowercase letters, a
                      number, and a special character.
                    </FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {!isSignIn && (
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl>
                      <PasswordField
                        {...field}
                        label="confirm password"
                        placeholder="Re-enter your password"
                        autoComplete="new-password"
                        disabled={busy}
                        required
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {isSignIn && (
              <div className="auth-options">
                <Popover>
                  <PopoverTrigger className="auth-forgot" disabled={busy}>
                    Forgot your password?
                  </PopoverTrigger>
                  <PopoverContent
                    align="end"
                    className="max-w-[calc(100vw-3rem)] p-5"
                  >
                    <h2 className="mb-2 font-semibold">
                      Need help signing in?
                    </h2>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      Password resets aren’t available yet. If you joined with
                      Google, choose “Continue with Google” to sign in.
                    </p>
                  </PopoverContent>
                </Popover>
                <FormField
                  control={form.control}
                  name="rememberMe"
                  render={({ field }) => (
                    <FormItem className="auth-remember">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          disabled={busy}
                        />
                      </FormControl>
                      <FormLabel>Remember me</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            )}

            <Button
              className="auth-submit-button"
              type="submit"
              disabled={busy}
            >
              {form.formState.isSubmitting && (
                <LoaderCircle
                  className="size-5 animate-spin"
                  aria-hidden="true"
                />
              )}
              {form.formState.isSubmitting
                ? isSignIn
                  ? "Logging in..."
                  : "Creating account..."
                : isSignIn
                  ? "Log in"
                  : "Create Account"}
            </Button>
          </fieldset>
        </form>
      </Form>

      <div className="auth-divider" aria-hidden="true">
        <Separator />
        <span>or</span>
        <Separator />
      </div>
      <GoogleAuthButton
        disabled={busy}
        loading={googleLoading}
        onCredential={onGoogleCredential}
      />
      <p className="auth-switch-prompt">
        {isSignIn ? "Don’t have an account?" : "Already have an account?"}{" "}
        <Link to={isSignIn ? "/signup" : "/signin"}>
          {isSignIn ? "Create account" : "Sign in"}
        </Link>
      </p>
    </div>
  );
}
