const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

async function fetchCeneoProductReview(productId, page) {
    const reviews = [];
    const url = `https://www.ceneo.pl/${productId}/opinie-${page}`;
    const response = await axios({ maxRedirects: 0, method: 'get', url });
    const html = response.data;
    const $ = cheerio.load(html);

    $(".review-box").each((_, elem) => {
        const box = $(elem);
        const score = box.find('.review-score-count').text().substr(0,1);
        const review = box.find('.product-review-body').text();
        reviews.push({ score, review })
    });
    return await reviews;
}

async function fetchCeneoProductReviews(productId) {
    let reviews = [];
    let i = 1;
    while(true) {
        try {
            const nextReviews = await fetchCeneoProductReview(productId, i);
            reviews = [ ...reviews, ...nextReviews ];
            i++;
        } catch (e) {
            break;
        }
    }
    return await reviews;
}

// const result = fetchCeneoProductReviews(76403130);
// console.log(r* esult);
async function fetchProducts(productIds) {
    console.log('* start fetching data');
    const startTime = new Date().getTime();
    let allReviews = [];
    for (let i = 0; i < productIds.length; i++) {
        const productId = productIds[i];
        const reviews = await fetchCeneoProductReviews(productId);
        allReviews = [ ...allReviews, ...reviews];
    }
    const stopTime = new Date().getTime();
    console.log('* finished fetching data in ' + ((stopTime - startTime) / 1000) + ' seconds');
    return allReviews
}

function countWords(words, word) {
    return words.filter(w => w === word).length;
}

function countCourses(words) {
    return words.filter(word => word.includes('**')).length;
}

function calculateNumberOfGoodWords(reviewAsArrayOfWords) {
    const words = ['fajny', 'fajne', 'zadowolony', 'zadowolona', 'polecam', 'godny', 'polecenia', 'śmiga', 'sprawnie', 'sprawny', 'szybko', 'super', 'świetny'];
    const map = words.map(word => countWords(reviewAsArrayOfWords, word));
    return map
        .reduce((a, b) => a + b, 0);
}

function calculateNumberOfBadWords(reviewAsArrayOfWords) {
    const words = ['porysowania', 'rysy', 'fatalny', 'fatalna', 'dramat', 'tragedia', 'tragiczny', 'rozczarowany'];
    const numberOfCurses = countCourses(reviewAsArrayOfWords);
    return words.map(word => countWords(reviewAsArrayOfWords, word))
        .reduce((a, b) => a + b, 0) + numberOfCurses;
}

function mapSinleVowpalWabbit({ score, review}) {
    const _label = score;
    const length = review.length;
    const reviewAsArrayOfWords = review.split(' ');
    const n_good = calculateNumberOfGoodWords(reviewAsArrayOfWords);
    const n_bad = calculateNumberOfBadWords(reviewAsArrayOfWords);

    return {
        _label,
        length,
        n_good,
        n_bad
    }
}

function mapToVowpalWabbitFormat(reviews) {
    console.log('* start analyze and mapping to VW JSON format');
    const startTime = new Date().getDate();
    const result = reviews.map(review => mapSinleVowpalWabbit(review));
    const stopTime = new Date().getDate();
    console.log('* analyze and mapping finished in ' + ((stopTime - startTime) / 1000) + ' seconds');
    return result;
}

function generateVWTextFormatData(vowpalData, dateInMillis) {
    // {
    //     _label,
    //         length,
    //         n_good,
    //         n_bad
    // }

    const path = `./results/results-${dateInMillis}-vw.txt`;
    fs.writeFile(path, '', 'utf8', () => {});
    vowpalData.forEach(e => {
        const text = `${e._label} | length:${e.length} n_good:${e.n_good} n_bad:${e.n_bad}\n`;
        fs.appendFile(path, text, 'utf8', () => {});
    })

}

async function start() {
    const productIds = [76403130,79218935, 81159668, 77226192, 79168976, 76367954, 77166127, 59663123, 60009559, 76367847, 76368072, 80689957, 76403130, 68821855, 55424288, 47044601, 55424279, 66604593, 47223332];
    const reviews = await fetchProducts(productIds);
    const currentTimeMillis = new Date().getTime();

    const reviewsAsJson = JSON.stringify(reviews, null, 4);
    const rawDataPath = `./results/results-${currentTimeMillis}-raw.json`;
    fs.writeFile(rawDataPath, reviewsAsJson, 'utf8', () => {});

    const reviewsInVowpalWabbitFormat = mapToVowpalWabbitFormat(reviews);
    const reviewsInVowpalWabbitFormatAsJson = JSON.stringify(reviewsInVowpalWabbitFormat, null, 4);
    const vowpalWabbitDataPath = `./results/results-${currentTimeMillis}-vowpal-wabbit.json`;
    fs.writeFile(vowpalWabbitDataPath, reviewsInVowpalWabbitFormatAsJson, 'utf8', () => {});

    generateVWTextFormatData(reviewsInVowpalWabbitFormat, currentTimeMillis);

    console.log(`* Pobrano ${reviews.length} opini z ${productIds.length} produktow. Zostaly one zapisane w pliku '${rawDataPath}' oraz '${vowpalWabbitDataPath}'`);
}

start()
