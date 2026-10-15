import { test, expect, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";

async function localSession(page: Page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Continue on this device", exact: true })
    .click();
  await expect(page.getByText("No active commitments found.")).toBeVisible();
}
async function start(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Create your first commitment", exact: true })
    .click();
  await page.getByRole("radio", { name: "Build", exact: true }).click();
  await page
    .getByRole("button", { name: "SET COMMITMENT →", exact: true })
    .click();
  await page.getByLabel("What is your target?", { exact: true }).fill(name);
  await page
    .getByRole("button", { name: "SET TIMELINE →", exact: true })
    .click();
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await page
    .getByRole("button", { name: "SET EXECUTION PACE →", exact: true })
    .click();
}
async function finish(page: Page) {
  await page.getByRole("button", { name: "SET REWARD →", exact: true }).click();
  await page
    .getByRole("button", { name: "A Good Coffee", exact: true })
    .click();
  await page
    .getByRole("button", { name: "LOCK IN COMMITMENT →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "CONFIRM & LOCK", exact: true })
    .click();
  await page.getByRole("button", { name: "YES, LOCK IT", exact: true }).click();
  await expect(page.getByText("Recent History", { exact: true })).toBeVisible();
}

test("create, log, filter, inspect history, and persist after reload", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await mkdir("artifacts/phase-4", { recursive: true });
  await page.goto("/");
  await expect(page.getByText("Ready to Lock In?")).toBeVisible();
  await page.screenshot({ path: "artifacts/phase-4/01-sign-in.png" });
  await page
    .getByRole("button", { name: "Continue on this device", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create your first commitment", exact: true })
    .click();
  await page.screenshot({ path: "artifacts/phase-4/02-choose-path.png" });
  await page.getByRole("radio", { name: "Build", exact: true }).click();
  await page
    .getByRole("button", { name: "SET COMMITMENT →", exact: true })
    .click();
  await page
    .getByLabel("What is your target?", { exact: true })
    .fill("Morning Meditation");
  await page
    .getByLabel("Description (Optional)", { exact: true })
    .fill("A quiet start to the day");
  await page
    .getByRole("button", { name: "SET TIMELINE →", exact: true })
    .click();
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await page
    .getByRole("button", { name: "SET EXECUTION PACE →", exact: true })
    .click();
  await finish(page);
  await page.screenshot({
    path: "artifacts/phase-4/03-detail.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "LOG PROGRESS", exact: true }).click();
  await page.getByRole("button", { name: "Done!", exact: true }).click();
  await expect(page.getByText("1 / 1 recorded.")).toBeVisible();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Morning Meditation", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: "artifacts/phase-4/04-focus.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Filter paused", exact: true })
    .click();
  await expect(page.getByText("No paused commitments found.")).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Morning Meditation, 1 of 1",
      exact: true,
    }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Filter active", exact: true })
    .click();
  await page.getByRole("tab", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("button", {
      name: "Morning Meditation, 1 of 1",
      exact: true,
    }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Morning Meditation, 1 of 1",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Focus", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Open Morning Meditation", exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("numeric target saves an absolute count and survives a reopen", async ({
  page,
}) => {
  await localSession(page);
  await start(page, "Hydration Intake");
  await page.getByRole("radio", { name: "Flexible Pace", exact: true }).click();
  await page.getByRole("button", { name: "Day", exact: true }).click();
  for (let i = 0; i < 7; i++)
    await page
      .getByRole("button", { name: "Increase count", exact: true })
      .click();
  await page.getByRole("button", { name: "Apply Target", exact: true }).click();
  await finish(page);
  await page.getByRole("button", { name: "LOG PROGRESS", exact: true }).click();
  for (let i = 0; i < 3; i++)
    await page
      .getByRole("button", { name: "Increase count", exact: true })
      .click();
  await page
    .getByRole("button", { name: "Apply Changes", exact: true })
    .click();
  await expect(page.getByText("3 / 10 recorded.")).toBeVisible();
  await page.reload();
  await expect(page.getByText("3 / 10 recorded.")).toBeVisible();
});
test("authentication guards, draft recovery, and Quit custom days work", async ({
  page,
}) => {
  await page.goto("/commitment/new");
  await expect(page.getByText("Ready to Lock In?")).toBeVisible();
  await page
    .getByRole("button", { name: "Continue on this device", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create your first commitment", exact: true })
    .click();
  await page.getByRole("radio", { name: "Quit", exact: true }).click();
  await page
    .getByRole("button", { name: "SET COMMITMENT →", exact: true })
    .click();
  await page
    .getByLabel("What is your target?", { exact: true })
    .fill("No Fast Food");
  await expect
    .poll(() =>
      page.evaluate(() => localStorage.getItem("lockin.draft.device")),
    )
    .toContain("No Fast Food");
  await page.reload();
  await page
    .getByRole("button", { name: "CONTINUE DRAFT", exact: true })
    .click();
  await expect(
    page.getByLabel("What is your target?", { exact: true }),
  ).toHaveValue("No Fast Food");
  await page
    .getByRole("button", { name: "SET TIMELINE →", exact: true })
    .click();
  await page.getByRole("button", { name: "7 days", exact: true }).click();
  await page
    .getByRole("button", { name: "SET EXECUTION PACE →", exact: true })
    .click();
  await page.getByRole("radio", { name: "Custom Days", exact: true }).click();
  await page.getByRole("button", { name: "Weekdays", exact: true }).click();
  await page.getByRole("checkbox", { name: "Sat", exact: true }).click();
  await page.getByRole("checkbox", { name: "Sun", exact: true }).click();
  await page.getByRole("button", { name: "Apply Target", exact: true }).click();
  await finish(page);
  await page.getByRole("button", { name: "LOG PROGRESS", exact: true }).click();
  await page
    .getByRole("button", { name: "Stayed Consistent", exact: true })
    .click();
  await expect(page.getByText("1 / 1 recorded.")).toBeVisible();
});

test("weekly quota logging counts successful dates in the dashboard", async ({
  page,
}) => {
  await localSession(page);
  await start(page, "Read a Chapter");
  await page.getByRole("radio", { name: "Flexible Pace", exact: true }).click();
  await page.getByRole("button", { name: "Apply Target", exact: true }).click();
  await finish(page);
  await page.getByRole("button", { name: "LOG PROGRESS", exact: true }).click();
  await page.getByRole("button", { name: "Done!", exact: true }).click();
  await page.getByRole("button", { name: "Go back", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Read a Chapter, 1 of 3", exact: true }),
  ).toBeVisible();
});

test("custom date range uses inclusive duration at compact phone size", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 640 });
  await page.clock.setFixedTime(new Date("2026-10-15T06:00:00Z"));
  await localSession(page);
  await start(page, "Stretch Daily");
  await page
    .getByRole("button", { name: "Previous step", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Custom Duration", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Oct 15, 2026, selected", exact: true })
    .click();
  await page.getByRole("button", { name: "Oct 24, 2026", exact: true }).click();
  await expect(
    page.getByText("Select custom duration", { exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: "artifacts/phase-4/05-custom-duration.png" });
  await page
    .getByRole("button", { name: "SET EXECUTION PACE →", exact: true })
    .click();
  await finish(page);
  await expect(page.getByText("Oct 24, 2026", { exact: true })).toBeVisible();
});
