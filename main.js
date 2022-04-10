const yargs = require('yargs/yargs');
const Crawler = require("crawler");
const sound = require("sound-play");

const LIST_ITEM_SELECTOR = ".offer"
const LIST_ITEM_LINK_SELECTOR = ".detailsLink";
const LIST_ITEM_PUBLICATION_DATE_SELECTOR = ".lheight16 span";
const ITEM_BODY_SELECTOR = ".css-1wws9er";

const ALREADY_WATCHED_ITEM_LINKS = new Set();

const argv = yargs(process.argv.slice(2))
    .option('baseUrl', {
        alias: 'u',
        description: 'Olx filter page url (without page number argument)',
        type: 'string'
    })
    .option('numberOfPages', {
        alias: 'n',
        description: 'Number of pages to search on',
        type: 'number'
    })
    .option('includes', {
        alias: 'i',
        description: 'List of strings that must be included (at least one) on the page to appear in result',
        type: 'array'
    })
    .option('excludes', {
        alias: 'e',
        description: 'List of strings that must NOT be included (any one) on the page to appear in result',
        type: 'array'
    })
    .option('maxMinutes', {
        alias: 'mm',
        description: 'Max number of minutes passed since item publication',
        type: 'number'
    })
    .option('loopSeconds', {
        alias: 'ls',
        description: 'If the parameter is set, the script will be run in loop with timeout set to the parameter',
        type: 'number'
    })
    .option('playSound', {
        alias: 'ps',
        description: 'If true sound will be played when new items found',
        type: 'boolean'
    })
    .help()
    .alias('help', 'h').argv;

const baseUrl = argv.baseUrl;
const numberOfPages = argv.numberOfPages;
const includes = argv.includes || [];
const excludes = argv.excludes || [];
const maxMinutes = argv.maxMinutes || -1;
const loopSeconds = argv.loopSeconds || -1;
const playSound = (typeof argv.playSound !== 'undefined') ? argv.playSound : (loopSeconds !== -1);

console.log(`Search parameters:
    baseUrl=${baseUrl}
    numberOfPages=${numberOfPages}
    includes=${includes}
    excludes=${excludes}
    maxMinutes=${maxMinutes}
    loopSeconds=${loopSeconds}
    playSound=${playSound}`);

function buildPageUrls(baseUrl, numberOfPages) {
    const pageUrls = [];
    for (let i = 1; i <= numberOfPages; i++) {
        pageUrls.push(baseUrl + "&page=" + i)
    }

    return pageUrls;
}

function crawl(urls, convertResponse) {
    return new Promise((resolve, reject) => {
        const results = new Set();

        const crawler = new Crawler({
            maxConnections: 3,
            callback: function (error, response, done) {
                if (error) {
                    console.log(error);
                } else {
                    convertResponse(response).forEach(result => results.add(result));
                }
                done();
            }
        });

        crawler.queue(urls);
        crawler.on('drain', () => resolve(Array.from(results)));
    });
}

function parseDate(dateString) {
    function parseHours(dateString) {
        return dateString.split(" ")[1].split(":")[0]
    }

    function parseMinutes(dateString) {
        return dateString.split(" ")[1].split(":")[1]
    }

    function createCurrentDateWithParsedTime(dateString) {
        const date = new Date();
        date.setHours(parseHours(dateString));
        date.setMinutes(parseMinutes(dateString));
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    }

    function createYesterdayDateWithParsedTime(dateString) {
        const date = createCurrentDateWithParsedTime(dateString);
        date.setHours(date.getHours() - 24);
        return date;
    }

    function parseDate(dateString) {
        const months = [{str: "янв", number: 0},
            {str: "фев", number: 1},
            {str: "мар", number: 2},
            {str: "апр", number: 3},
            {str: "мая", number: 4},
            {str: "июн", number: 5},
            {str: "июл", number: 6},
            {str: "авг", number: 7},
            {str: "сен", number: 8},
            {str: "окт", number: 9},
            {str: "ноя", number: 10},
            {str: "дек", number: 11}];

        let date = null;
        months.forEach(month => {
            if (dateString.includes(month.str)) {
                date = new Date();
                date.setMonth(month.number);
                date.setDate(Number(dateString.split(" ")[0]))
                date.setSeconds(0);
                date.setMilliseconds(0);
            }
        })

        if(date == null) {
            throw new Error(`There is no month mapping for string="${dateString}" in ${JSON.stringify(months)}`);
        }

        return date;
    }

    if (dateString.includes("Сегодня")) {
        return createCurrentDateWithParsedTime(dateString);
    }

    if (dateString.includes("Вчера")) {
        return createYesterdayDateWithParsedTime(dateString);
    }

    return new Date(parseDate((dateString)));
}

function filterOnlyNewItems(items) {
    return items.filter(foundItem => !ALREADY_WATCHED_ITEM_LINKS.has(foundItem.link));
}

function collectItems(baseUrl, numberOfPages) {
    function isPublicationDateMatched(publicationDate) {
        if (maxMinutes === -1) {
            return true;
        }

        const currentDate = new Date();
        return publicationDate > currentDate.setMinutes(currentDate.getMinutes() - maxMinutes);
    }

    return crawl(buildPageUrls(baseUrl, numberOfPages), response => {
        const items = []
        const $ = response.$;

        $(LIST_ITEM_SELECTOR).each((index, element) => {
            const dateString = $($(element).find(LIST_ITEM_PUBLICATION_DATE_SELECTOR)[1]).text();
            const publicationDate = parseDate(dateString)
            if (isPublicationDateMatched(publicationDate)) {
                items.push({
                    "link": $(element).find(LIST_ITEM_LINK_SELECTOR).attr('href').split("#")[0],
                    "date": publicationDate
                });
            }
        });

        return items;
    });
}

function filterItems(items, includePatters, excludePatterns) {
    items = filterOnlyNewItems(items);

    if (includePatters.length === 0 && excludePatterns.length === 0) {
        items.forEach(item => ALREADY_WATCHED_ITEM_LINKS.add(item.link));
        return new Promise((resolve, reject) => resolve(items));
    }

    function isBodyMatched(text) {
        return includePatters.some(pattern => text.includes(pattern))
            && !excludePatterns.some(pattern => text.includes(pattern));
    }

    return crawl(items.map(item => item.link), response => {
        ALREADY_WATCHED_ITEM_LINKS.add(response.request.uri.href)
        const $ = response.$;

        const body = $(ITEM_BODY_SELECTOR).text();
        if (isBodyMatched(body)) {
            return items.filter(item => item.link === response.request.uri.href);
        }

        return [];
    });
}

function sortItemsByDate(items) {
    return items.sort((a, b) => (a.date > b.date) ? -1 : 1);
}


function run() {
    collectItems(baseUrl, numberOfPages)
        .then(items => filterItems(items, includes, excludes)
            .then(filteredItem => {
                console.log("--------------------------------------------------------------------------------")
                if (filteredItem.length > 0) {
                    console.log("Found items:" + JSON.stringify(sortItemsByDate(filteredItem), null, "  "));
                    if(playSound) {
                        sound.play("sound/found-new-items.mp3");
                    }
                } else {
                    console.log("No new items found");
                }
                console.log("--------------------------------------------------------------------------------")
            }))
}

function runInLoop() {
    run();
    setTimeout(runInLoop, loopSeconds * 1000)
}

if (loopSeconds === -1) {
    run();
} else {
    runInLoop();
}