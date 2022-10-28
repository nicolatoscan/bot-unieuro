import { Telegraf } from 'telegraf'
import axios from 'axios'
import dotenv from 'dotenv'
import { parse } from 'node-html-parser';
import * as fs from 'fs';
import * as path from 'path';
dotenv.config()

const WAIT_ON_TROVATA = 3 * 60 * 1000
const WAIT_ON_NON_TROVATA = 2 * 1000

const BOT_TOKEN = process.env.BOT_TOKEN
const CHANNEL_ID = process.env.CHANNEL_ID
if (!CHANNEL_ID) {
    console.log("No CHANNEL_ID");
    process.exit(1)
}
if (!BOT_TOKEN) {
    console.log("No BOT_TOKEN");
    process.exit(1)
}

const bot = new Telegraf(BOT_TOKEN)

type ELinkType = 'unieuro' | 'mediaworld' | 'nexths';

let listToCheck: [ELinkType, string, string][] = getListToCheck();
const syncSeconds = 15;
setInterval(() => { listToCheck = getListToCheck(); }, 15 * 1000);

let finito = false;
process.once('SIGINT', () => { bot.stop('SIGINT'); finito = true; })
process.once('SIGTERM', () => { bot.stop('SIGTERM'); finito = true; })
listToCheck.forEach(el => {
    lavoraPerEl(el[0], el[1], el[2]);
})

function getListToCheck() {
    const filePath = path.join(__dirname, 'list.json');
    const text = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(text);
}


async function lavoraPerEl(type: ELinkType, url: string, name: string) {
    while (!finito) {
        await checkEl(type, url, name);
    }
}

async function checkEl(type: ELinkType, url: string, name: string) {
    console.log(`Checking ${name}`);

    let res = false;
    switch (type) {
        case 'mediaworld':
            res = await checkMedia(url);
            break;
        case 'unieuro':
            res = await checkUni(url);
            break;
    }

    if (res) {

        let sendingAttempt = 10;
        while (sendingAttempt > 0) {
            let r;
            switch (type) {
                case 'mediaworld':
                    r = await sendMsgFoundMedia(name, url);
                    await delay(500)
                    sendingAttempt--;
                    if (r)
                        sendingAttempt = 0;
                    break;
                case 'unieuro':
                    r = await sendMsgFoundMedia(name, url);
                    await delay(500)
                    sendingAttempt--;
                    if (r)
                        sendingAttempt = 0;
                    break;
            }
        }

        console.log(`Trovata la ${name}`);
        await delay(WAIT_ON_TROVATA)
    } else {
        await delay(WAIT_ON_NON_TROVATA)
    }
}

async function sendMsgFoundMedia(name: string, url: string): Promise<boolean> {
    try {
        await bot.telegram.sendMessage(CHANNEL_ID ?? '', `🏬Mediaworld\n\n✅👉${name}\n\n📎[Comprala QUI](${url})`, { parse_mode: "MarkdownV2" })
        return true;
    } catch {
        return false;
    }
}

async function checkMedia(url: string): Promise<boolean> {
    return await checkForString(url, 'prodotto non disponibile', 'p.services__item')
}

async function checkUni(url: string): Promise<boolean> {
    return await checkForString(url, 'non disponibile', '#features > div.details-table-head.features > div > div > span:nth-child(2)')
}

async function checkForString(url: string, toFind: string, querySelector: string): Promise<boolean> {
    try {
        const html = await (await axios.get(url)).data as string;
        const parsedHtml = parse(html).querySelectorAll(querySelector)
        const res = parsedHtml.map(el => el.text).find(el => el.toLowerCase().includes(toFind))
        return res ? false : true;
    } catch {
        return false;
    }
}


async function delay(ms: number) {
    await new Promise(res => setTimeout(res, ms));
}