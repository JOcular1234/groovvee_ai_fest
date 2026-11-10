import { normalizeEmail } from "../lib/auth/password";
import { closeScriptDb, scriptDb as db, waitForDb } from "./prisma";

const OLD_EMAIL = "mfonobngumoh75@gmail.com";
const NEW_EMAIL = "mfonobongumoh75@gmail.com";

async function main() {
  await waitForDb();

  const clash = await db.admin.findUnique({
    where: { email: normalizeEmail(NEW_EMAIL) },
    select: { id: true },
  });
  if (clash) {
    console.log("Refused: an admin already uses", NEW_EMAIL);
    process.exitCode = 1;
    return;
  }

  const res = await db.admin.updateMany({
    where: { email: normalizeEmail(OLD_EMAIL) },
    data: { email: normalizeEmail(NEW_EMAIL) },
  });
  console.log(res.count === 1 ? `Updated email → ${NEW_EMAIL}` : "No matching admin found");
}

main()
  .catch((e) => {
    console.error("Failed:", e.message);
    process.exitCode = 1;
  })
  .finally(closeScriptDb);
