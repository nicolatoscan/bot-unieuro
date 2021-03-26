import { Telegraf } from 'telegraf'
import axios from 'axios'
import dotenv from 'dotenv'
import { parse } from 'node-html-parser';
dotenv.config()

const WAIT_ON_TROVATA = 3*60*1000
const WAIT_ON_NON_TROVATA = 2*1000

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

enum ELinkType { UNIEURO, MEDIAWORLD, NEXTHS }

const listToCheck: [ELinkType, string, string][] = [
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-993279/asus-tuf-geforce-gtx-1660-6gb", "ASUS TUF GeForce GTX 1660 6Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-119330/msi-geforce-gtx-1660-6gb", "MSI GeForce GTX 1660 6Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-119331/msi-geforce-gtx-1660-6gb-xs", "MSI GeForce GTX 1660 6Gb XS"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-119329/msi-geforce-gtx-1660-super-6gb-xs", "MSI GeForce GTX 1660 Super 6Gb XS"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-144417/msi-geforce-gtx-1660-6gb", "MSI GeForce GTX 1660 6Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-119327/msi-geforce-gtx-1660ti-6gb-xs", "MSI GeForce GTX 1660TI 6Gb XS"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-991819/asus-phoenix-geforce-rtx-2060-6gb", "ASUS Phoenix GeForce RTX 2060 6Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-119343/msi-radeon-rx-5700-xt-8gb", "MSI Radeon RX 5700 XT 8Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-144430/msi-radeon-rx-5700-xt-8gb", "MSI Radeon RX 5700 XT 8Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-153357/asus-tuf-geforce-rtx-3060-12gb", "ASUS TUF GeForce RTX 3060 12Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-152810/asus-rog-strix-geforce-rtx-3060-12gb", "ASUS ROG STRIX GeForce RTX 3060 12Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-149212/asus-dual-geforce-rtx-3060-ti-8gb", "ASUS Dual GeForce RTX 3060 Ti 8Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-100380/evga-geforce-rtx-2070-8gb", "EVGA GeForce® RTX 2070 8Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-145091/asus-tuf-geforce-rtx-3070-8gb", "ASUS TUF GeForce RTX 3070 8Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-140082/asus-tuf-geforce-rtx-3080-10gb", "ASUS TUF GeForce RTX 3080 10Gb"],
    [ ELinkType.MEDIAWORLD, "https://www.mediaworld.it/product/p-149220/asus-rog-strix-geforce-rtx-3070-8gb", "ASUS ROG STRIX GeForce RTX 3070 8Gb"],
    [ ELinkType.UNIEURO, "https://www.unieuro.it/online/Schede-grafiche/DUAL-RTX3060TI-O8G-pidASU60YV0G12M0NA00", "ASUS Dual -RTX3060TI-O8G "],
    [ ELinkType.UNIEURO, "https://www.unieuro.it/online/Schede-grafiche/DUAL-RTX3070-O8G-pidASU90YV0FQ0M0NA00", "ASUS Dual -RTX3070-O8G"],
    [ ELinkType.UNIEURO, "https://www.unieuro.it/online/Schede-grafiche/TUF-RTX3080-O10G-GAMING-pidASU90YV0FB1M0NM00", "ASUS TUF Gaming TUF-RTX3080-O10G"],
];

let finito = false;
process.once('SIGINT', () => { bot.stop('SIGINT'); finito = true; })
process.once('SIGTERM', () => { bot.stop('SIGTERM'); finito = true; })
listToCheck.forEach(el => {
    lavoraPerEl(el[0], el[1], el[2]);
})


async function lavoraPerEl(type: ELinkType, url: string, name: string) {
    while (!finito) {
        await checkEl(type, url, name);
    }
}

async function checkEl(type: ELinkType, url: string, name: string) {
    console.log(`Checking ${name}`);
    
    let res = false;
    switch (type) {
        case ELinkType.MEDIAWORLD:
            res = await checkMedia(url);
            break;
        case ELinkType.UNIEURO:
            res = await checkUni(url);
            break;
    }

    if (res) {

        let sendingAttempt = 10;
        while (sendingAttempt > 0) {
            let r;
            switch (type) {
                case ELinkType.MEDIAWORLD:
                    r = await sendMsgFoundMedia(name, url);
                    await delay(500)
                    sendingAttempt--;
                    if (r)
                        sendingAttempt = 0;
                    break;
                case ELinkType.UNIEURO:
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

async function sendMsgFound(name: string, url: string): Promise<boolean> {
    try {
        await bot.telegram.sendMessage(CHANNEL_ID ?? '', `🏬Unieuro\n\n✅👉${name}\n\n📎[Comprala QUI](${url})`,{parse_mode: "MarkdownV2"})
        return true;
    } catch {
        return false;
    }
}
async function sendMsgFoundMedia(name: string, url: string): Promise<boolean> {
    try {
        await bot.telegram.sendMessage(CHANNEL_ID ?? '', `🏬Mediaworld\n\n✅👉${name}\n\n📎[Comprala QUI](${url})`,{parse_mode: "MarkdownV2"})
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