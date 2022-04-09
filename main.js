const Crawler = require("crawler");

const numberOfPages = 25;
const baseUrl = 'https://www.olx.ua/nedvizhimost/kvartiry/dolgosrochnaya-arenda-kvartir/dnepr/?search%5Bdescription%5D=1'

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
            maxConnections: 10,
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

function filterItems(itemUrls, patters) {
    return new Promise((resolve, reject) => {
        const filteredItemUrls = [];

        function isMatched(text) {
            return patters.some(pattern => text.includes(pattern));
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
    .then(itemUrls => filterItems(itemUrls, ["Можно с животными", "Можно с питомцами"])
        .then(filteredItemUrls => {
            filteredItemUrls.forEach(filteredItemUrl => {
                console.log(filteredItemUrl);
            })
        }))

