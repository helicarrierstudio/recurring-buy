
const express = require('express');
const app = express();
const path = require('path');
const api = require('./modules/api');

app.set('port', (process.env.PORT || 5000));

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', function (request, response) {
    response.sendFile(path.join(__dirname + '/views/index.html'));
});

app.get('/setup', function (request, response) {
    response.sendFile(path.join(__dirname + '/views/setup.html'));
})

app.get('/api/setup', (req, res) => {

    
    const getOptions = async (nairaSpendPerMonth) => {

        nairaSpendPerMonth = parseFloat(nairaSpendPerMonth);

        const price = (await api.getInstantPrices())[0];
        const buyPrice = parseFloat(price.buyPricePerCoin);
        const minBuy = parseFloat(price.minBuy);

        const coinAmountForNairaSpend = nairaSpendPerMonth / price.buyPricePerCoin;

        console.log(coinAmountForNairaSpend)

        console.log(`With NGN${nairaSpendPerMonth}, you can purchase ${coinAmountForNairaSpend} BTC each month`);

        const daily = coinAmountForNairaSpend / 30;
        const weekly = coinAmountForNairaSpend / 4;
        const monthly = coinAmountForNairaSpend;

        const dailyAvailable = daily >= minBuy;
        const weeklyAvailable = weekly >= minBuy;
        const monthlyAvailable = monthly >= minBuy;

        console.log(`Daily: ${daily} BTC (${dailyAvailable ? 'available' : 'unavailable'})`);
        console.log(`Weekly: ${weekly} BTC (${weeklyAvailable ? 'available' : 'unavailable'})`);
        console.log(`Monthly: ${monthly} BTC (${monthlyAvailable ? 'available' : 'unavailable'})`);


        let option = dailyAvailable ? 'daily' : weeklyAvailable ? 'weekly' : monthlyAvailable ? 'monthly' : null;

        if (option) {
            console.log(`Based on the current minimum purchase of ${minBuy} BTC, we recommend you go with a ${option} buy`);
        } else {
            console.log(`Based on the current minimum purchase of ${minBuy} BTC, the amount you've chosen is too small`);
        }
    };

    getOptions(40000)

});

app.listen(app.get('port'), function () {
    console.log('App is running, server is listening on port ', app.get('port'));
});

