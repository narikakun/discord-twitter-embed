const { Events } = require('discord.js');
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const request = require("request");

module.exports = {
    name: Events.MessageCreate,
    async execute(msg) {
        if (msg.author.bot) return;
        let urls = String(msg.content).match(/https?:\/\/[-_.!~*\'()a-zA-Z0-9;\/?:\@&=+\$,%#\u3000-\u30FE\u4E00-\u9FA0\uFF01-\uFFE3]+/g);
        if (!urls) return;
        for (const url of urls.slice(0, 4)) {
            let tweetUrlRegex = /https:\/\/(?:x\.com|twitter\.com)\/([^\/]+)\/status\/([^\/]+)/;
            let matches = url.match(tweetUrlRegex);
            if (!matches) return;
            let userName = matches[1];
            let tweetID = matches[2];
            const instanceUrl = "https://nitter.uni-sonia.com";
            let getTweet = await requestPromise({
                "url": `${instanceUrl}/${userName}/status/${tweetID}`,
                "method": "GET",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                }
            });
            const dom = new JSDOM(getTweet);
            const document = dom.window.document;
            const mainTweet = document.getElementById("m");
            const tweetFullName = mainTweet.getElementsByClassName("fullname").item(0)?.textContent;
            const tweetUserName = mainTweet.getElementsByClassName("username").item(0)?.textContent;
            const tweetAvatar = mainTweet.getElementsByClassName("tweet-avatar").item(0)?.getElementsByClassName("avatar").item(0)?.getAttribute("src");
            const tweetDate = mainTweet.getElementsByClassName("tweet-published").item(0)?.textContent;
            const tweetContent = mainTweet.getElementsByClassName("tweet-content").item(0)?.textContent;
            let tweetAttachments = [];
            const tweetAttachmentsClass = mainTweet.getElementsByClassName("attachment");
            for (const class1 of tweetAttachmentsClass) {
                let attachmentHref = class1.children[0].getAttribute("href");
                if (!attachmentHref) {
                    attachmentHref = class1.children[0].getAttribute("src");
                }
                tweetAttachments.push(`${instanceUrl}${attachmentHref}`)
            }
            const tweetStats = mainTweet.getElementsByClassName("tweet-stats").item(0);
            const commentCount = Number(tweetStats.children[0].textContent);
            const reTweetCount = Number(tweetStats.children[1].textContent);
            const quoteCount = Number(tweetStats.children[2].textContent);
            const heartCount = Number(tweetStats.children[3].textContent);
            const reTweetPlusQuote = reTweetCount + quoteCount;
            let stats = [];
            if (commentCount) {
                stats.push(`💬 ${commentCount} replies`);
            }
            if (reTweetPlusQuote) {
                stats.push(`♻ ${reTweetCount} reposts`);
            }
            if (heartCount) {
                stats.push(`❤ ${heartCount} likes`);
            }
            let embeds = [{
                title: tweetFullName,
                url: `https://twitter.com/${tweetUserName}/status/${tweetID}`,
                author: {
                    name: tweetUserName,
                    icon_url: `${instanceUrl}/${tweetAvatar}`,
                    url: `https://twitter.com/${tweetUserName}`
                },
                description: omittedContent(tweetContent) + `${stats[0] ? `\n\n${stats.join(" · ")}` : ""}`,
                timestamp: parseUTCDateString(tweetDate),
                footer: {
                    text: `Posted by ${tweetFullName} (${tweetUserName})`,
                    icon_url: 'https://cdn.discordapp.com/emojis/1186553229954269224.webp',
                },
                color: 0x000000
            }];
            if (tweetAttachments[0]) {
                embeds[0].image = {
                    url: tweetAttachments[0]
                }
            }
            if (tweetAttachments[1]) {
                for (let i = 1; i < tweetAttachments.length; i++) {
                    embeds.push({
                        url: `https://twitter.com/${tweetUserName}/status/${tweetID}`,
                        image: {
                            url: tweetAttachments[i]
                        }
                    })
                }
            }
            await msg.reply({
                embeds: embeds
            })
        }
    }
}

function requestPromise(param) {
    return new Promise((resolve, reject) => {
        request(param, function (error, response, body) {
            if (error) {
                reject(error);
            } else {
                resolve(body);
            }
        })
    })
}

function omittedContent(string) {
    const MAX_LENGTH = 1500;
    if (string.length > MAX_LENGTH) {
        return string.substring(0, MAX_LENGTH) + '...';
    }
    return string;
}

function parseUTCDateString(dateString) {
    let months = {
        'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11
    };

    let dateParts = dateString.match(/(\w+) (\d+), (\d+) · (\d+):(\d+) (\w+)/);

    let month = months[dateParts[1]];
    let day = parseInt(dateParts[2]);
    let year = parseInt(dateParts[3]);
    let hours = parseInt(dateParts[4]);
    let minutes = parseInt(dateParts[5]);

    if (dateParts[6] === "PM" && hours !== 12) {
        hours += 12;
    } else if (dateParts[6] === "AM" && hours === 12) {
        hours = 0;
    }
    return new Date(Date.UTC(year, month, day, hours, minutes));
}