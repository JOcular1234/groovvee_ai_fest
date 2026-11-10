import readline from "node:readline";
import {
  ProvisionError,
  provisionSuperAdmin,
} from "../lib/auth/provision";
import { passwordIssues } from "../lib/auth/password";
import { closeScriptDb, scriptDb, waitForDb } from "./prisma";

function createRl(muted: { value: boolean }) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });
  const anyRl = rl as unknown as {
    _writeToOutput: (s: string) => void;
    output: NodeJS.WritableStream;
  };
  const original = anyRl._writeToOutput.bind(rl);
  anyRl._writeToOutput = (s: string) => {
    if (muted.value && !s.includes("\n") && !s.includes("\r")) {
      anyRl.output.write("*");
    } else {
      original(s);
    }
  };
  return rl;
}

function ask(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

async function main() {
  console.log("Groovvee AI Fest — Super Admin provisioning\n");
  await waitForDb();

  const muted = { value: false };
  const rl = createRl(muted);
  try {
    const name = (await ask(rl, "Name: ")).trim();
    const email = (await ask(rl, "Email: ")).trim();

    muted.value = true;
    const password = await ask(rl, "Password: ");
    const confirm = await ask(rl, "Confirm password: ");
    muted.value = false;

    if (password !== confirm) {
      console.error("\nPasswords do not match.");
      process.exitCode = 1;
      return;
    }

    const issues = passwordIssues(password);
    if (issues.length > 0) {
      console.error("\nPassword too weak:");
      issues.forEach((i) => console.error(`  - ${i}`));
      process.exitCode = 1;
      return;
    }

    const admin = await provisionSuperAdmin(scriptDb, {
      name,
      email,
      password,
    });
    console.log(
      `\nSuper Admin created: ${admin.name} <${admin.email}> (role: ${admin.role})`
    );
  } catch (err) {
    if (err instanceof ProvisionError) {
      if (err.code === "already_exists") {
        console.error(
          "\nRefused: a Super Admin already exists. This command cannot overwrite or reset existing administrators."
        );
      } else {
        console.error(`\nFailed: ${err.message}`);
        err.details?.forEach((d) => console.error(`  - ${d}`));
      }
      process.exitCode = 1;
      return;
    }
    throw err;
  } finally {
    rl.close();
    await closeScriptDb();
  }
}

main().catch((err) => {
  console.error("Provisioning failed:", err.message);
  process.exit(1);
});
