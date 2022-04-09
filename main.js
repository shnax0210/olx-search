const yargs = require('yargs/yargs');
const Crawler = require("crawler");

const ITEM_LINK_SELECTOR = ".detailsLink";
const ITEM_BODY_SELECTOR = ".css-1wws9er";
const ITEM_PUBLICATION_DATE_SELECTOR = ".css-19yf5ek";

const argv = yargs(process.argv.slice(2))
    .option('baseUrl', {
        alias: 'u',
        description: 'Olx filter page url (without page number argument)',
        type: 'string'
    })
    .option('numberOfPages', {
        alias: 'n',
        description: 'Number of page to search on',
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
    .help()
    .alias('help', 'h').argv;

const baseUrl = argv.baseUrl;
const numberOfPages = argv.numberOfPages;
const includes = argv.includes || [];
const excludes = argv.excludes || [];
const maxMinutes = argv.maxMinutes || -1;
const loopSeconds = argv.loopSeconds || -1;

console.log(`Passed search parameters:
    baseUrl=${baseUrl}
    numberOfPages=${numberOfPages}
    includes=${includes}
    excludes=${excludes}
    maxMinutes=${maxMinutes}
    loopSeconds=${loopSeconds}`);

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

let PREVIOUSLY_FOUND_ITEMS = [];

function collectItemUrls(baseUrl, numberOfPages) {
    return crawl(buildPageUrls(baseUrl, numberOfPages), response => {
        const itemUrls = []
        const $ = response.$;
        $(ITEM_LINK_SELECTOR).each((index, element) => {
            itemUrls.push($(element).attr('href'));
        });

        return itemUrls;
    }).then(foundItems => {
        let results = foundItems.filter(foundItem => !PREVIOUSLY_FOUND_ITEMS.includes(foundItem));
        PREVIOUSLY_FOUND_ITEMS = foundItems;
        return results;
    });
}

function parseDate(dateString) {
    function parseHours(dateString) {
        return dateString.split(" ")[2].split(":")[0]
    }

    function parseMinutes(dateString) {
        return dateString.split(" ")[2].split(":")[1]
    }

    function createCurrentDateWithParsedTime(dateString) {
        const date = new Date();
        date.setHours(parseHours(dateString));
        date.setMinutes(parseMinutes(dateString));
        date.setSeconds(0);
        date.setMilliseconds(0);
        return date;
    }

    function prepareStringForDateParsing(dateString) {
        const months = [{str: "января", number: "01"},
            {str: "февраля", number: "02"},
            {str: "марта", number: "03"},
            {str: "апреля", number: "04"},
            {str: "мая", number: "05"},
            {str: "июня", number: "06"},
            {str: "июля", number: "07"},
            {str: "августа", number: "08"},
            {str: "сентября", number: "09"},
            {str: "октября", number: "10"},
            {str: "ноября", number: "11"},
            {str: "декабря", number: "12"}];

        months.forEach(month => {
            if (dateString.includes(month.str)) {
                dateString = `${month.number}/` + dateString.replace(` ${month.str} `, "/");
            }
        })

        return dateString.replace(" г.", "");
    }

    if (dateString.includes("Сегодня")) {
        return createCurrentDateWithParsedTime(dateString);
    }

    return new Date(prepareStringForDateParsing((dateString)));
}

function filterItems(itemUrls, includePatters, excludePatterns) {
    function isBodyMatched(text) {
        return includePatters.some(pattern => text.includes(pattern))
            && !excludePatterns.some(pattern => text.includes(pattern));
    }

    function isPublicationDateMatched(publicationDate) {
        if (maxMinutes === -1) {
            return true;
        }

        const currentDate = new Date();
        return publicationDate > currentDate.setMinutes(currentDate.getMinutes() - maxMinutes);
    }

    return crawl(itemUrls, response => {
        const $ = response.$;

        const body = $(ITEM_BODY_SELECTOR).text();
        const publicationDate = parseDate($(ITEM_PUBLICATION_DATE_SELECTOR).text())
        if (isBodyMatched(body) && isPublicationDateMatched(publicationDate)) {
            return [{
                "link": response.request.uri.href,
                "date": publicationDate
            }]
        }

        return [];
    });
}

function sortItemsByDate(items) {
    return items.sort((a, b) => (a.date > b.date) ? -1 : 1);
}


function run() {
    collectItemUrls(baseUrl, numberOfPages)
        .then(itemUrls => filterItems(itemUrls, includes, excludes)
            .then(filteredItemUrls => {
                console.log("--------------------------------------------------------------------------------")
                if(filteredItemUrls.length > 0) {
                    console.log("Found items:" + JSON.stringify(sortItemsByDate(filteredItemUrls), null, "  "));
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