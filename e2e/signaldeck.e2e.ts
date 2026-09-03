import { expect, test } from "@playwright/test";

test("turns a manual signal into a saved WeChat brief", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Today's AI Content Signals" })).toBeVisible();
  await expect(page.getByText("还没有候选内容")).toBeVisible();

  await page.getByRole("button", { name: "+ Add URL" }).click();
  await page.locator('input[name="url"]').fill("https://example.invalid/ai-launch");
  await page.locator('input[name="title"]').fill("Example AI Workflow Launch");
  await page.locator('textarea[name="summary"]').fill("A public open-source browser agent demo");
  await page.getByRole("button", { name: "Add to Radar" }).click();

  await expect(page.getByRole("link", { name: "Example AI Workflow Launch" })).toBeVisible();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByRole("button", { name: "Unsave" })).toBeVisible();

  await page.getByRole("link", { name: "Saved" }).click();
  await expect(page.getByRole("link", { name: "Example AI Workflow Launch" })).toBeVisible();
  await page.getByRole("link", { name: "Example AI Workflow Launch" }).click();

  await expect(page.getByRole("heading", { name: "Example AI Workflow Launch" })).toBeVisible();
  await page.getByRole("button", { name: "WeChat" }).click();
  await expect(page).toHaveURL(/\/content\//);
  await expect(page.getByRole("heading", { name: "wechat brief" })).toBeVisible();
  await expect(page.locator("pre")).toContainText("Example AI Workflow Launch");
});

test("shows seeded sources and adds a custom RSS feed", async ({ page }) => {
  await page.goto("/settings/sources");
  await expect(page.getByRole("heading", { name: "Sources" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "OpenAI", exact: true })).toBeVisible();

  await page.locator('input[name="name"]').fill("Example Feed");
  await page.locator('input[name="feedUrl"]').fill("https://example.invalid/feed.xml");
  await page.getByRole("button", { name: "Add feed" }).click();

  await expect(page.getByRole("cell", { name: "Example Feed", exact: true })).toBeVisible();
  await expect(page.getByRole("cell", { name: "https://example.invalid/feed.xml" })).toBeVisible();
});

test("supports ignore, restore, and the remaining brief types", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "+ Add URL" }).click();
  await page.locator('input[name="url"]').fill("https://example.invalid/second-signal");
  await page.locator('input[name="title"]').fill("Second AI Signal");
  await page.getByRole("button", { name: "Add to Radar" }).click();

  await page.getByRole("link", { name: "Second AI Signal" }).click();
  const eventUrl = page.url();
  await page.getByRole("button", { name: "Ignore" }).last().click();
  await expect(page.getByRole("button", { name: "Restore" }).last()).toBeVisible();
  await page.getByRole("button", { name: "Restore" }).last().click();
  await expect(page.getByRole("button", { name: "Ignore" }).last()).toBeVisible();

  await page.getByRole("button", { name: "Short video" }).last().click();
  await expect(page.getByRole("heading", { name: "short video brief" })).toBeVisible();
  await expect(page.locator("pre")).toContainText("script60");

  await page.goto(eventUrl);
  await page.getByRole("button", { name: "Long video" }).last().click();
  await expect(page.getByRole("heading", { name: "long video brief" })).toBeVisible();
  await expect(page.locator("pre")).toContainText("sections");
});
