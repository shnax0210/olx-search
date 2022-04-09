const yargs = require('yargs/yargs');
const Crawler = require("crawler");

const ITEM_LINK_SELECTOR = ".detailsLink";
const ITEM_BODY_SELECTOR = ".css-1wws9er";

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
    .help()
    .alias('help', 'h').argv;

const baseUrl = argv.baseUrl;
const numberOfPages = argv.numberOfPages;
const includes = argv.includes || [];
const excludes = argv.excludes || [];

console.log(`Passed search parameters:
    baseUrl=${baseUrl}
    numberOfPages=${numberOfPages}
    includes=${includes}
    excludes=${excludes}`)

function buildPageUrls(baseUrl, numberOfPages) {
    const pageUrls = [];
    for (let i = 1; i <= numberOfPages; i++) {
        pageUrls.push(baseUrl + "page=" + i)
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

function collectItemUrls(baseUrl, numberOfPages) {
    return crawl(buildPageUrls(baseUrl, numberOfPages), response => {
        const itemUrls = []
        const $ = response.$;
        $(ITEM_LINK_SELECTOR).each((index, element) => {
            itemUrls.push($(element).attr('href'));
        });

        return itemUrls;
    });
}

function filterItems(itemUrls, includePatters, excludePatterns) {
    function isMatched(text) {
        return includePatters.some(pattern => text.includes(pattern))
            && !excludePatterns.some(pattern => text.includes(pattern));
    }

    return crawl(itemUrls, response => {
        const $ = response.$;
        const body = $(ITEM_BODY_SELECTOR).text();
        return isMatched(body) ? [response.request.uri.href] : [];
    });
}

collectItemUrls(baseUrl, numberOfPages)
    .then(itemUrls => filterItems(itemUrls, includes, excludes)
        .then(filteredItemUrls => {
            console.log("Found items:" + JSON.stringify(filteredItemUrls));
        }))
