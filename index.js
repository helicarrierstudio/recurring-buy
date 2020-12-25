
const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const api = require('./modules/api');
const db = require('./modules/db');

app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

function format(n, type) {

    function numberWithCommas(x) {
        return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    
    n = parseFloat(n);
    n = n.toFixed(type === 'coin' ? 8 : 2);

    if (type === 'fiat') n = numberWithCommas(n);

    return n;
}

app.get('/', async (req, res) => {

    const CONFIG = {
        AMOUNT: format(process.env.BUY_AMOUNT || 12000, 'fiat'),
        FREQUENCY: process.env.BUY_FREQUENCY || 'DAILY',
    };

    const summaries = await db.getAllSummaries();

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
        CONFIG,
        summaries,
        totalAmount,
        totalCost
    });
});

app.get('/setup', (req, res) =>  {
    res.render('setup', { setupOptions: null });
});

app.post('/setup', async (req, res) => {

    console.log(req.body);

    
    const getOptions = async (monthlySpend) => {

        monthlySpend = parseFloat(monthlySpend);

        const price = (await api.getInstantPrices())[0];
        const buyPrice = parseFloat(price.buyPricePerCoin);
        const minBuy = parseFloat(price.minBuy);

        const monthlyAmount = monthlySpend / price.buyPricePerCoin;

        console.log(monthlyAmount)

        console.log(`With NGN${monthlySpend}, you can buy ${monthlyAmount} BTC each month`);

        const daily = monthlyAmount / 30;
        const weekly = monthlyAmount / 4;
        const monthly = monthlyAmount;

        const dailySpend = daily * buyPrice;
        const weeklySpend = weekly * buyPrice;
        // const monthlySpend = monthly * buyPrice;

        const dailyAvailable = daily >= minBuy;
        const weeklyAvailable = weekly >= minBuy;
        const monthlyAvailable = monthly >= minBuy;

        console.log(`Daily: ${daily} BTC (${dailyAvailable ? 'available' : 'unavailable'})`);
        console.log(`Weekly: ${weekly} BTC (${weeklyAvailable ? 'available' : 'unavailable'})`);
        console.log(`Monthly: ${monthly} BTC (${monthlyAvailable ? 'available' : 'unavailable'})`);


        let suggestedOption = dailyAvailable ? 'daily' : weeklyAvailable ? 'weekly' : monthlyAvailable ? 'monthly' : null;

        if (suggestedOption) {
            console.log(`Based on the current minimum buy of ${minBuy} BTC, we recommend you go with a ${suggestedOption} buy`);
        } else {
            console.log(`Based on the current minimum buy of ${minBuy} BTC, the amount you've chosen is too small`);
        }

        return {
            buyPrice: format(buyPrice, 'fiat'),
            minBuy: format(minBuy, 'coin'),
            monthlySpend: format(monthlySpend, 'fiat'),
            monthlyAmount: format(monthlyAmount, 'coin'),

            daily: {
                amount: format(daily, 'coin'),
                spend: dailySpend,
                available: dailyAvailable
            },
            weekly: {
                amount: format(weekly, 'coin'),
                spend: weeklySpend,
                available: weeklyAvailable
            },
            monthly: {
                amount: format(monthly, 'coin'),
                spend: monthlySpend,
                available: monthlyAvailable
            },

            suggestedOption,
        }
    };

    const setupOptions = await getOptions(req.body.monthly_spend);

    console.log(setupOptions);

    res.render('setup', {
        setupOptions
    });

});

app.get('/welcome', (req, res) =>  {
    res.render('welcome');
});

app.listen(app.get('port'), function () {
    console.log('App is running, server is listening on port ', app.get('port'));
});

