
const express = require('express');
const app = express();
const path = require('path');
const bodyParser = require('body-parser');
const api = require('./modules/api');
const db = require('./modules/db');
const bn = require('./modules/big-number');

app.set('port', (process.env.PORT || 5000));
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, '/public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));


function parseError(error) {

    error = error.split(':')[0];

    const errors = {
        'no_market_orders': 'No market orders available to buy from',
        'btc_amount_too_small': 'Your set amount is too small',
        'failed_market_order': 'Failed market order',
        'no_instant_price': 'Couldn\'t find BuyCoins price',
        'failed_instant_order': 'Failed instant order',
    };

    return errors[error] || 'Unknown error';
}


app.get('/', async (req, res) => {

    const CONFIG = {
        AMOUNT: bn.format(process.env.BUY_AMOUNT || 12000, 'fiat'),
        FREQUENCY: process.env.BUY_FREQUENCY || 'DAILY',
    };

    const summaries = await db.getAllSummaries();

    let totalAmount = 0;
    let totalCost = 0;
    let avergaePrice = 0;
    let prices = [];

    summaries.forEach((s, index, arr) => {
        const summary = {
            date: s[0]
        };

        if (s[4] && s[5]) {
            const amount = s[4];
            const price = s[5];
            const cost = bn.multiply(amount, price, 'fiat');

            summary.amount = bn.format(amount, 'coin');
            summary.price = bn.format(price, 'fiat');
            summary.cost = bn.format(cost, 'fiat' );

            totalAmount = bn.add( totalAmount, amount, 'coin' );
            totalCost = bn.add( totalCost, cost, 'coin' );

            prices.push(price);
        } else if (s[1] || s[2]) {
            const instant_error = s[2];
            const market_error = s[1];
            summary.error = parseError(instant_error || market_error);
        }

        arr[index] = summary;
    });

    summaries.reverse();

    totalAmount = bn.format(totalAmount, 'coin');
    totalCost = bn.format(totalCost, 'fiat');
    avergaePrice = bn.format( bn.average(prices, 'fiat'), 'fiat' );


    res.render('index', { 
        CONFIG,
        summaries,
        totalAmount,
        totalCost,
        avergaePrice
    });
});

app.get('/setup', (req, res) =>  {
    res.render('setup', { setupOptions: null });
});

app.post('/setup', async (req, res) => {

    
    const getOptions = async (monthlySpend) => {

    
        const price = (await api.getInstantPrices())[0];
        const buyPrice = bn.round(price.buyPricePerCoin, 'fiat');
        const minBuy = bn.round(price.minBuy, 'coin');

        const monthlyAmount = bn.divide(monthlySpend, buyPrice, 'coin');
        const monthlyAvailable = bn.isGreaterThanOrEqualTo(monthlyAmount, minBuy);

        const weeklyAmount = bn.divide(monthlyAmount, 4, 'coin');
        const weeklySpend = bn.multiply(weeklyAmount, buyPrice, 'fiat');
        const weeklyAvailable = bn.isGreaterThanOrEqualTo(weeklyAmount, minBuy);

        const dailyAmount = bn.divide(monthlyAmount, 30, 'coin');
        const dailySpend = bn.multiply(dailyAmount, buyPrice, 'fiat');
        const dailyAvailable = bn.isGreaterThanOrEqualTo(dailyAmount, minBuy);
        
        const suggestedOption = dailyAvailable ? 'daily' : weeklyAvailable ? 'weekly' : monthlyAvailable ? 'monthly' : null;

        return {
            buyPrice: bn.format(buyPrice, 'fiat'),
            minBuy: bn.format(minBuy, 'coin'),
            monthlySpend: bn.format(monthlySpend, 'fiat'),
            monthlyAmount: bn.format(monthlyAmount, 'coin'),

            daily: {
                amount: bn.format(dailyAmount, 'coin'),
                spend: dailySpend,
                available: dailyAvailable
            },
            weekly: {
                amount: bn.format(weeklyAmount, 'coin'),
                spend: weeklySpend,
                available: weeklyAvailable
            },
            monthly: {
                amount: bn.format(monthlyAmount, 'coin'),
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

