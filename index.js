
const express = require('express');
const app = express();
const path = require('path');
const api = require('./modules/api');
const db = require('./modules/db');

app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, '/public')));

app.get('/', async (req, res) => {

    const summaries = await db.getAllSummaries();

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }

    function format(n, type) {
        n = parseFloat(n);
        n = n.toFixed(type === 'coin' ? 8 : 2);

        if (type === 'fiat') n = numberWithCommas(n);

        return n;
    }

    let totalAmount = 0;
    let totalCost = 0;

    summaries.forEach((s, index, arr) => {
        const summary = {
            date: s[0]
        };

        if (s[4] && s[5]) {
            const amount = parseFloat(s[4]);
            const price = parseFloat(s[5]);
            const cost = amount * price;

            summary.amount = format(amount, 'coin');
            summary.price = format(price, 'fiat');
            summary.cost = format(cost, 'fiat' );

            totalAmount += parseFloat(amount);
            totalCost += parseFloat(cost);
        }

        arr[index] = summary;
    });

    totalAmount = format(totalAmount, 'coin');
    totalCost = format(totalCost, 'fiat');


    res.render('index', { 
        summaries,
        totalAmount,
        totalCost
    });
});

app.get('/setup', (req, res) =>  {
    res.render('setup');
});

app.get('/api/setup', (req, res) => {

    
    const getOptions = async (nairaSpendPerMonth) => {

        nairaSpendPerMonth = parseFloat(nairaSpendPerMonth);

        const price = (await api.getInstantPrices())[0];
        const buyPrice = parseFloat(price.buyPricePerCoin);
        const minBuy = parseFloat(price.minBuy);

        const coinAmountForNairaSpend = nairaSpendPerMonth / price.buyPricePerCoin;

        console.log(coinAmountForNairaSpend)

        console.log(`With NGN${nairaSpendPerMonth}, you can buy ${coinAmountForNairaSpend} BTC each month`);

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
            console.log(`Based on the current minimum buy of ${minBuy} BTC, we recommend you go with a ${option} buy`);
        } else {
            console.log(`Based on the current minimum buy of ${minBuy} BTC, the amount you've chosen is too small`);
        }
    };

    getOptions(40000)

});

app.listen(app.get('port'), function () {
    console.log('App is running, server is listening on port ', app.get('port'));
});

