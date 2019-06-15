const fs = require('fs');

function analyze(resultsPath, toTrainPath) {
    const analyzeResultPath = './results/analyze-results.txt';
    fs.writeFile(analyzeResultPath, `originScore | calculated\n`, 'utf8', () => {});

    fs.readFile(resultsPath, 'utf8', (_, resultsContent) => {
        const resultsAsArray = resultsContent.split('\r\n')
            .map(item => item.substr(0, 4));
        let sum = 0;
        let count = 0;
        fs.readFile(toTrainPath, 'utf8', (_, toTrainContent) => {
            const toTrainAsArray = toTrainContent.split('\n')
                .map(e => e.substr(0, 1));
            for (let i = 0; i < resultsAsArray.length - 1 /* last empty line */; i++) {
                const scoreFromVW = resultsAsArray[i];
                const originScore = toTrainAsArray[i];
                const diff = (parseFloat(scoreFromVW) - parseFloat(originScore)) / 2;
                sum += diff >= 0 ? diff : diff * (-1);
                count ++;

                fs.appendFile(analyzeResultPath, `${originScore} | ${scoreFromVW}\n`, 'utf8', () => {});
            }
            const avg = sum / count;
            setTimeout(function() {fs.appendFile(analyzeResultPath, `Wynik: ${avg.toFixed(2)}`, 'utf8', () => {})}, 1000)
        });
    });
}
analyze('./results/results.txt', './results/results-1560592116646-vw-toTrain.txt');
