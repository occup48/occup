export type AuthMode = "signin" | "signup";

export type AuthFormValues = {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  confirmPassword?: string;
  rememberMe?: boolean;
};

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "customer" | "admin";
};

export type AuthSession = { user: AuthUser; accessToken: string };
export type SignUpResult = { user: AuthUser; accessToken?: string };
