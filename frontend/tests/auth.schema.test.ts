import assert from "node:assert/strict";
import { test } from "node:test";
import { signInSchema, signUpSchema } from "../src/features/auth/validation/auth.schema.ts";

const details = {
  firstName: "Ada", lastName: "Okafor", email: "ada@example.com",
  password: "ValidPass1!", confirmPassword: "ValidPass1!",
};

test("sign-in accepts existing short passwords without imposing new signup rules", () => {
  assert.equal(signInSchema.safeParse({ email: details.email, password: "old" }).success, true);
  assert.equal(signInSchema.safeParse({ email: details.email, password: "" }).success, false);
});

test("signup enforces each password requirement independently", () => {
  for (const password of ["Aa1!", "UPPERCASE1!", "lowercase1!", "NoNumbers!", "NoSpecials1"]) {
    assert.equal(signUpSchema.safeParse({ ...details, password, confirmPassword: password }).success, false, password);
  }
  assert.equal(signUpSchema.safeParse(details).success, true);
});

test("the bcrypt limit counts UTF-8 bytes rather than characters", () => {
  const password = "Aa1!" + "é".repeat(34);
  assert.equal(new TextEncoder().encode(password).length, 72);
  assert.equal(signUpSchema.safeParse({ ...details, password, confirmPassword: password }).success, true);
  assert.equal(signUpSchema.safeParse({ ...details, password: password + "é", confirmPassword: password + "é" }).success, false);
  assert.equal(signInSchema.safeParse({ email: details.email, password: password + "é" }).success, false);
});

test("signup normalizes names and email, preserving the exact password", () => {
  const value = signUpSchema.parse({ ...details, firstName: " Ada ", lastName: " Okafor ", email: " ADA@example.COM " });
  assert.equal(value.firstName, "Ada");
  assert.equal(value.lastName, "Okafor");
  assert.equal(value.email, "ada@example.com");
  assert.equal(value.password, details.password);
});

test("password mismatch belongs to confirmPassword, and backend name limits are respected", () => {
  const result = signUpSchema.safeParse({ ...details, confirmPassword: "Different1!" });
  assert.equal(result.success, false);
  if (!result.success) assert.deepEqual(result.error.issues[0].path, ["confirmPassword"]);
  assert.equal(signUpSchema.safeParse({ ...details, firstName: "A" }).success, false);
  assert.equal(signUpSchema.safeParse({ ...details, lastName: "A".repeat(101) }).success, false);
});
