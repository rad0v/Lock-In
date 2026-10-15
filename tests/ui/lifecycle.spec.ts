import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { type Commitment } from "../../src/domain/commitments";

const c: Commitment = {
  id: "lifecycle-test",
  attemptId: "lifecycle-test",
  name: "Daily Yoga Practice",
  description: "A little space to breathe",
  path: "build",
  duration: 7,
  startDate: "2026-10-15",
  pace: { kind: "daily", count: 1 },
  reward: "A Good Coffee",
  timeZone: "Asia/Kolkata",
  status: "active",
  createdAt: "2026-10-15T04:00:00Z",
};
async function seed(
  page: Page,
  commitment = c,
  logged = false,
  time = "2026-10-15T06:00:00Z",
) {
  await page.clock.setFixedTime(new Date(time));
  await page.goto("/");
  await page.evaluate(
    ({ commitment, logged }) => {
      localStorage.setItem("lockin.device-session.v1", "1");
      localStorage.setItem(
        "lockin.device-data.v1",
        JSON.stringify({
          commitments: [commitment],
          checkIns: logged
            ? [
                {
                  attemptId: commitment.attemptId,
                  date: commitment.startDate,
                  count: 1,
                  updatedAt: commitment.createdAt,
                },
              ]
            : [],
        }),
      );
    },
    { commitment, logged },
  );
  await page.goto(`/commitment/${commitment.id}`);
  await expect(page.getByText("Recent History", { exact: true })).toBeVisible();
}
test("pause confirmation preserves today's check-in, resume survives reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("artifacts/phase-6", { recursive: true });
  await seed(page);
  await page
    .getByRole("button", { name: "Pause Commitment", exact: true })
    .click();
  await expect(page.getByText(/Pause from tomorrow/)).toBeVisible();
  await page
    .getByRole("button", { name: "CONFIRM PAUSE", exact: true })
    .click();
  await expect(page.getByText("paused", { exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole("button", { name: "LOG PROGRESS", exact: true }).click();
  await page.getByRole("button", { name: "Done!", exact: true }).click();
  await expect(page.getByText("1 / 1 recorded.")).toBeVisible();
  await page.screenshot({ path: "artifacts/phase-6/01-paused.png" });
  await page
    .getByRole("button", { name: "Resume Commitment", exact: true })
    .click();
  await expect(page.getByText("active", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("active", { exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});
test("explicit failure confirms, reflection restarts once, old history stays available", async ({
  page,
}) => {
  await seed(page);
  await page.getByRole("button", { name: "LOG PROGRESS", exact: true }).click();
  await page.getByRole("button", { name: "Missed", exact: true }).click();
  await page.getByRole("button", { name: "KEEP GOING", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Done!", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Missed", exact: true }).click();
  await page
    .getByRole("button", { name: "CONFIRM & END ATTEMPT", exact: true })
    .click();
  await expect(
    page.getByText("Why did it Unlock?", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Low Energy", exact: true }).click();
  await page.screenshot({ path: "artifacts/phase-6/02-reflection.png" });
  await page
    .getByRole("button", { name: "Secure Log & Restart", exact: true })
    .click();
  await expect(page.getByText("active", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "VIEW PREVIOUS ATTEMPT", exact: true })
    .click();
  await expect(
    page.getByText("Low Energy", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await expect(
    page.getByText("broken", { exact: true }).filter({ visible: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/phase-6/03-broken.png" });
  await page.goto("/commitment/reflect?id=lifecycle-test");
  await page
    .getByRole("button", { name: "VIEW NEW ATTEMPT", exact: true })
    .click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("lockin.device-data.v1")!),
  );
  expect(saved.commitments).toHaveLength(2);
  expect(saved.commitments[1].reflection.reason).toBe("Low Energy");
});
test("expired attempt reconciles on open and final success unlocks reward in History", async ({
  page,
}) => {
  await seed(page, c, false, "2026-10-17T00:00:00Z");
  await expect(page.getByText("broken", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Restart Commitment", exact: true }),
  ).toBeVisible();
  await seed(page, { ...c, duration: 1 }, true, "2026-10-16T00:00:00Z");
  await expect(page.getByText("completed", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Reward unlocked", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/phase-6/04-completed.png" });
  await page.goto("/");
  await expect(page.getByText("No active commitments found.")).toBeVisible();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Open ${c.name}`, exact: true }),
  ).toBeVisible();
});
test("weekly missed outcome stays active and settings persist independent motion/haptics", async ({
  page,
}) => {
  await seed(page, { ...c, pace: { kind: "weekly", count: 3 } });
  await page.getByRole("button", { name: "LOG PROGRESS", exact: true }).click();
  await page.getByRole("button", { name: "Not today", exact: true }).click();
  await page
    .getByRole("button", { name: "CONFIRM MISSED DAY", exact: true })
    .click();
  await expect(page.getByText("active", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Missed outcome recorded.", { exact: true }),
  ).toBeVisible();
  await page.goto("/settings");
  await page
    .getByRole("switch", { name: "Haptic feedback", exact: true })
    .click();
  await page
    .getByRole("switch", { name: "Reduce motion", exact: true })
    .click();
  await page
    .getByLabel("Reminder time (24-hour)", { exact: true })
    .fill("25:99");
  await page
    .getByRole("button", { name: "SAVE REMINDER TIME", exact: true })
    .click();
  await expect(
    page.getByText("Use a time like 20:00 (24-hour clock).", { exact: true }),
  ).toBeVisible();
  await page
    .getByLabel("Reminder time (24-hour)", { exact: true })
    .fill("19:30");
  await page
    .getByRole("button", { name: "SAVE REMINDER TIME", exact: true })
    .click();
  await expect(
    page.getByText("Reminder time saved.", { exact: true }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("switch", { name: "Haptic feedback", exact: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("switch", { name: "Reduce motion", exact: true }),
  ).toBeChecked();
  await expect(
    page.getByLabel("Reminder time (24-hour)", { exact: true }),
  ).toHaveValue("19:30");
  await expect(
    page.getByRole("switch", { name: "Daily reminders", exact: true }),
  ).toBeDisabled();
  await page.screenshot({ path: "artifacts/phase-6/05-preferences.png" });
});
test("normal motion modal can exit and reopen without stuck backdrop", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await seed(page);
  for (let i = 0; i < 3; i++) {
    await page
      .getByRole("button", { name: "LOG PROGRESS", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Close dialog", exact: true })
      .click();
    await expect(
      page.getByText("Daily Log Progress", { exact: true }),
    ).toBeHidden();
  }
  await page
    .getByRole("button", { name: "Pause Commitment", exact: true })
    .click();
  await page.getByRole("button", { name: "KEEP GOING", exact: true }).click();
  await expect(
    page.getByText("Pause your commitment?", { exact: true }),
  ).toBeHidden();
});
