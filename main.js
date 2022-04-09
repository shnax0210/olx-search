const yargs = require('yargs/yargs');
const Crawler = require("crawler");

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

function collectItemUrls(baseUrl, numberOfPages) {
    return new Promise((resolve, reject) => {
        const itemUrls = [];

        const crawler = new Crawler({
            maxConnections: 3,
            callback: function (error, res, done) {
                if (error) {
                    console.log(error);
                } else {
                    const $ = res.$;
                    $(".detailsLink").each((index, e) => {
                        const href = $(e).attr('href')
                        if(!itemUrls.includes(href)) {
                            itemUrls.push(href);
                        }
                    });
                }
                done();
            }
        });

        crawler.queue(buildPageUrls(baseUrl, numberOfPages));

        crawler.on('drain', function () {
            resolve(itemUrls);
        });
    });
}

function filterItems(itemUrls, includePatters, excludePatterns) {
    return new Promise((resolve, reject) => {
        const filteredItemUrls = [];

        function isMatched(text) {
            return includePatters.some(pattern => text.includes(pattern))
                && !excludePatterns.some(pattern => text.includes(pattern));
        }

        const crawler = new Crawler({
            maxConnections: 3,
            callback: function (error, res, done) {
                if (error) {
                    console.log(error);
                } else {
                    const $ = res.$;
                    const body = $(".css-1wws9er").text();
                    if (isMatched(body) && !filteredItemUrls.includes(res.request.uri.href)) {
                        filteredItemUrls.push(res.request.uri.href)
                    }
                }
                done();
            }
        });

        crawler.queue(itemUrls);

        crawler.on('drain', function () {
            resolve(filteredItemUrls);
        });
    });
}

collectItemUrls(baseUrl, numberOfPages)
    .then(itemUrls => filterItems(itemUrls, includes, excludes)
        .then(filteredItemUrls => {
            console.log("Found items:");
            filteredItemUrls.forEach(filteredItemUrl => {
                console.log(filteredItemUrl);
            })
        }))

