import asyncio
from playwright.async_api import async_playwright
import os

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(
            viewport={'width': 1280, 'height': 720},
            record_video_dir="/home/jules/verification/videos"
        )
        page = await context.new_page()

        file_path = os.path.abspath("index.html")
        print(f"Loading game from {file_path}")
        await page.goto(f"file://{file_path}")
        await page.wait_for_timeout(1000)

        # 1. Open Settings Menu
        print("Opening Settings Menu...")
        await page.click('#open-settings-btn')
        await page.wait_for_timeout(500)

        # Take screenshot of settings menu
        os.makedirs("/home/jules/verification/screenshots", exist_ok=True)
        await page.screenshot(path="/home/jules/verification/screenshots/settings_menu.png")

        # Select Synthwave theme
        print("Selecting Synthwave theme...")
        await page.select_option('#theme-select', 'synthwave')
        await page.wait_for_timeout(500)

        # Close Settings Menu
        await page.click('#close-settings-btn')
        await page.wait_for_timeout(500)

        # 2. Start Game
        print("Starting Game...")
        await page.click("#start-btn")
        await page.wait_for_timeout(2000)

        # 3. Simulate typing matching keys
        for key in ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"]:
            await page.keyboard.press(key)
            await page.wait_for_timeout(80)

        await page.wait_for_timeout(1000)

        # Screenshot gameplay
        await page.screenshot(path="/home/jules/verification/screenshots/verification.png")

        # 4. Test Pause
        print("Pausing Game...")
        await page.keyboard.press("Escape")
        await page.wait_for_timeout(500)
        await page.screenshot(path="/home/jules/verification/screenshots/pause_menu.png")

        await context.close()
        await browser.close()
        print("Verification complete!")

if __name__ == "__main__":
    asyncio.run(run())
