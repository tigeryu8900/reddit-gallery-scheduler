import puppeteer from "puppeteer";
import "dotenv/config";

import fs from "fs/promises";
import * as path from "path";

const scheduled = new Set();

async function post(dir) {
    console.log("Posting", dir);
    const data = JSON.parse((await fs.readFile(path.join("schedule", "pending", dir, "data.json"))).toString());
    console.log("Starting Puppeteer");
    const browser = await puppeteer.launch({headless: "new"});
    try {
        const page = await browser.newPage();
        await page.setUserAgent((await browser.userAgent()).replace(/headless/gi, ""));
        console.log("Signing in");
        await page.goto("https://www.reddit.com/login/");
        await page.type('#loginUsername', process.env.USERNAME);
        await page.type('#loginPassword', process.env.PASSWORD);
        await page.click('.AnimatedForm [type="submit"]');
        await page.waitForNetworkIdle();
        console.log("Creating post");
        await page.goto(`https://www.reddit.com/${data.subreddit}/submit`);
        await page.waitForSelector('::-p-xpath(//*[text()="Images" or text()="Images & Video"])');
        await page.click('::-p-xpath(//*[text()="Images" or text()="Images & Video"])');
        await page.type('[placeholder="Title"]', data.title);
        console.log("Adding images");
        for (let image of data.images) {
            let elementHandle = await page.$('input[type="file"]');
            await elementHandle.uploadFile(path.join("schedule", "pending", dir, image.file));
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        let divs = [];
        let time = Date.now();
        while (divs.length < data.images.length) {
            if (Date.now() - time > 10000) {
                console.error("Not enough images", dir, data);
                return;
            }
            divs = await page.$$('div[draggable="true"]:has([style*="background-image"])');
        }
        await divs[0].click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        for (let i = data.images.length - 1; i >= 0; --i) {
            await divs[i].click();
            await new Promise(resolve => setTimeout(resolve, 1000));
            if (data.images[i].caption) {
                await page.type('[placeholder="Add a caption..."]', data.images[i].caption);
            }
            if (data.images[i].link) {
                await page.type('[placeholder="Add a link..."]', data.images[i].link);
            }
        }
        console.log("Setting tags and flair");
        if (data.oc) {
            await page.click('::-p-xpath(//*[text()="OC"])');
        }
        if (data.spoiler) {
            await page.click('::-p-xpath(//*[text()="Spoiler"])');
        }
        if (data.nsfw) {
            await page.click('::-p-xpath(//*[text()="NSFW"])');
        }
        if (data.flair) {
            await page.click('::-p-xpath(//*[text()="Flair"])');
            await page.click(`[aria-label="flair_picker"] ::-p-xpath(//*[text()=${JSON.stringify(data.flair)}])`);
            await page.click('::-p-xpath(//*[text()="Apply"])');
        }
        await page.click('::-p-xpath(//*[not(.//i) and text()="Post"])');
        await page.waitForNavigation();
        if (data.comments) {
            console.log("Adding comments");
            let markdown = await page.$('::-p-xpath(//*[text()="Markdown Mode"])');
            if (markdown) {
                await markdown.click();
            }
            for (let comment of data.comments) {
                await page.waitForSelector('[placeholder="What are your thoughts?"]');
                await page.type('[placeholder="What are your thoughts?"]', comment);
                await page.click('[type="submit"]');
                await page.waitForNetworkIdle();
            }
        }
        await fs.rename(path.join("schedule", "pending", dir), path.join("schedule", "done", dir));
        console.log("Posted", dir, page.url(), data);
    } catch (e) {
        console.error("Error", dir, data, e);
    } finally {
        await browser.close();
    }
}

function schedule(dir) {
    try {
        let time = Date.parse(dir.replace(/^(\d+)-(\d+)-(\d+) (\d+)-(\d+)-(\d+)$/,
            "$1-$2-$3T$4:$5:$6"));
        if (!scheduled.has(time)) {
            scheduled.add(time);
            setTimeout(post, time - Date.now(), dir);
            console.log("Scheduled", dir);
        }
    } catch (e) {
        console.error(e);
    }
}

(async () => {
    console.log(new Date());
    await fs.mkdir(path.join("schedule", "pending"), {recursive: true}).catch(() => {});
    await fs.mkdir(path.join("schedule", "done"), {recursive: true}).catch(() => {});
    for (let dir of await fs.readdir(path.join("schedule", "pending"))) {
        schedule(dir);
    }
    for await (let event of fs.watch(path.join("schedule", "pending"))) {
        schedule(event.filename);
    }
})();
