import "dotenv/config";
import { z } from "zod";
import { db } from "@/lib/db";
import { createCredentialUser, ensureAdmin } from "@/server/provision-user";

const envSchema = z.object({
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z
    .string()
    .min(10, "Admin password must be at least 10 characters"),
  ADMIN_NAME: z.string().min(1),
});

async function main() {
  const env = envSchema.safeParse(process.env);
  if (!env.success) {
    console.error("Invalid environment variables:");
    for (const issue of env.error.issues) {
      console.error(`  ${issue.path.join(".")}: ${issue.message}`);
    }
    process.exit(1);
  }

  const { ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME } = env.data;

  console.log(`Creating admin user: ${ADMIN_EMAIL}`);

  const user = await createCredentialUser({
    email: ADMIN_EMAIL,
    name: ADMIN_NAME,
    password: ADMIN_PASSWORD,
  });

  await ensureAdmin({
    userId: user.id,
    name: ADMIN_NAME,
    email: ADMIN_EMAIL,
    permission: "full",
  });

  console.log(`Admin created successfully: ${ADMIN_EMAIL}`);
  // Password is intentionally not printed
}

main()
  .catch((err) => {
    console.error("Failed to create admin:", err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
