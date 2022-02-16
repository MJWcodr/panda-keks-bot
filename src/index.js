// dependencies
import { Telegraf, Markup } from 'telegraf';
import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { rejects } from 'assert';
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// load environment variables
config();

const token = process.env.BOT_TOKEN
if (token === undefined) {
    throw new Error('BOT_TOKEN must be provided!')
}

const bot = new Telegraf(token)

bot.help((ctx) => {
    ctx.reply(`
/hrt → sends an ai generated quote to tell the hrt-date`)
})

let toDays = (date) => Math.round(date / 86400000);

function getNow() {
    return new Date()
}

let hrtDate = new Date(process.env.HRT_DATE)
let untilHrt = toDays(hrtDate - getNow())
let reg = "\${X}"

async function queryGPT3(data = "euphoria") {
    let authorization = process.env.OPENAI_TOKEN;
    let url = "https://api.openai.com/v1/engines/davinci-codex/completions";

    const prompt = readFileSync(`data/${data}`, 'utf-8'); //TODO: ADD PROMPT

    const body = {
        "prompt": prompt,
        "temperature": 0.7,
        "max_tokens": 60,
        "top_p": 1,
        "frequency_penalty": 0.38,
        "presence_penalty": 0.37,
        "stop": ["\n"]
    };

    return new Promise((resolve, reject) => {
        fetch(url, {
            method: "post",
            headers: {
                'Authorization': `Bearer ${authorization}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        })
            .then(response => response.json())
            .then(data => {
                console.log(data)
                resolve(data)
            })
            .catch(err => {
                reject(err)
            })
    })
}


// #region
bot.command('hrt', (ctx) => {
    getHRT().then(response => {
        ctx.reply(response)
    })
    .catch(err => {
        ctx.reply("1: an error occured")
    })
})

function getHRT() {
    return new Promise((resolve) => {
        queryGPT3("hrt-sentences")
            .then(data => {
                console.log(getNow())
                let response = data.choices[0].text.replace(/[(\$*)]/g, untilHrt)
                let unsafeHRTWords = ["woman", "women", "suicide", "death", "pain", "titties", "tits"]
                if (unsafeHRTWords.indexOf(response) === -1) {
                    resolve(response)
                }
                else {
                    if (ErrCounter < 5) {
                        resolve(getHRT())
                    } else {
                        reject("unsafe word")
                    }
                }
            })
    })

}


//#endregion

bot.launch()

// Enable graceful stope
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))