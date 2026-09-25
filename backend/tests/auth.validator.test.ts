import assert from "node:assert/strict";
import { test } from "node:test";
import bcrypt from "bcryptjs";
import { signInSchema, signUpSchema } from "../src/validators/auth.validator.js";

const account = {
  firstName: "Test",
  lastName: "User",
  email: "test@example.com",
};

test("rejects the reported emoji password before bcrypt can truncate it", async () => {
  const prefix = "\u{1F600}".repeat(18);
  const password = prefix + "A1a!";
  assert.equal(Buffer.byteLength(password, "utf8"), 76);
  const hash = await bcrypt.hash(password, 4);
  assert.equal(await bcrypt.compare(prefix, hash), true);
  assert.equal(signUpSchema.safeParse({ ...account, password }).success, false);
  assert.equal(signInSchema.safeParse({ ...account, password }).success, false);
});

for (const [name, password] of [
  ["ASCII", "a".repeat(68) + "A1a!"],
  ["two-byte characters", "\u00e9".repeat(34) + "A1a!"],
  ["emoji", "\u{1F600}".repeat(17) + "A1a!"],
] as const) {
  test(`${name}: accepts 72 bytes unchanged and rejects 73 bytes`, () => {
    assert.equal(Buffer.byteLength(password, "utf8"), 72);
    for (const schema of [signUpSchema, signInSchema]) {
      assert.equal(schema.parse({ ...account, password }).password, password);
      const result = schema.safeParse({ ...account, password: password + "a" });
      assert.equal(result.success, false);
      if (!result.success) {
        assert.ok(result.error.issues.some(
          (issue) => issue.path[0] === "password" &&
            issue.message === "Password must not exceed 72 UTF-8 bytes",
        ));
      }
    }
  });
}

test("preserves signup strength rules and signin's required-password rule", () => {
  for (const password of ["", "A1a!", "abcdefgh", "ABCDEFG1!", "abcdefg1!", "Abcdefgh!", "Abcdefg1"]) {
    assert.equal(signUpSchema.safeParse({ ...account, password }).success, false);
  }
  assert.equal(signInSchema.safeParse({ ...account, password: "" }).success, false);
  assert.equal(signInSchema.parse({ ...account, password: "a" }).password, "a");
});

test("signup accepts a 100-character email and rejects a valid 101-character email", () => {
  const email = `${"A".repeat(60)}@${"b".repeat(35)}.com`;
  assert.equal(email.length, 100);
  const parsed = signUpSchema.parse({ ...account, email, password: "Valid-password1!" });
  assert.equal(parsed.email, email.toLowerCase());

  const result = signUpSchema.safeParse({ ...account, email: `a${email}`, password: "Valid-password1!" });
  assert.equal(result.success, false);
  if (!result.success) {
    assert.deepEqual(result.error.flatten().fieldErrors, {
      email: ["Email must not exceed 100 characters"],
    });
  }
});
