const fs = require('fs');
const path = require('path');
const api = require('./api');

const CONFIG = {
    AMOUNT: process.env.CONFIG_AMOUNT || 12000,
    FREQUENCY: process.env.CONFIG_FREQUENCY || 'DAILY', // DAILY, WEEKLY_[1-7], MONTHLY_[1-29]
};

const summaryFilePath = path.join(__dirname + '/../public/summary.json');

const writeSummaryFile = (data) => {
    return new Promise((resolve) => {
        fs.writeFile(summaryFilePath, JSON.stringify(data), {encoding: 'utf-8'}, function(err,data){
            if (!err) {
                resolve(data)
            } else {
                console.log(err);
            }
        });

    });
};

const readSummaryFile = () => {
    return new Promise((resolve) => {
        fs.readFile(summaryFilePath, {encoding: 'utf-8'}, function(err,data){
            if (!err) {
                resolve( JSON.parse(data) )
            } else {
                console.log(err);
            }
        });

    });
};

const getTodaysKey = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    return `${year}-${month}-${day}`;
};

const addPurchaseToSummary = async (data) => {
    data.timestamp = Date.now();

    const summary = await readSummaryFile();
    const key = getTodaysKey();

    if (!summary[key]) summary[key] = {};

    summary[key].purchase = data;

    console.log(data);

    writeSummaryFile(summary);
};

const addErrorToSummary = async (data) => {
    data.timestamp = Date.now();

    const summary = await readSummaryFile();
    const key = getTodaysKey();

    if (!summary[key]) summary[key] = {};
    if (!summary[key].errors) summary[key].errors = [];

    summary[key].errors.push(data);

    console.log(data);

    writeSummaryFile(summary);
};

const checkIfShouldBuyToday = async () => {

    const today = new Date();
    const frequency_period = CONFIG.FREQUENCY.split('_')[0];

    let shouldBuyToday = false;

    switch (frequency_period) {
        case 'DAILY':
            shouldBuyToday = true;
            break;

        case 'WEEKLY':
            const frequency_day = parseInt(CONFIG.FREQUENCY.split('_')[1]);
            const day = today.getDay();
            shouldBuyToday = frequency_day === day;
            break;

        case 'MONTHLY':
            const frequency_date = parseInt(CONFIG.FREQUENCY.split('_')[1]);
            const date = today.getDate();
            shouldBuyToday = frequency_date === date;
            break;
    }

    if (shouldBuyToday) {
        const summary = await readSummaryFile();
        const key = getTodaysKey();

        shouldBuyToday = !(summary[key] && summary[key].purchase);
    }

    console.log("Should Buy Today:", shouldBuyToday)
    return shouldBuyToday;
};



const buyViaMarket = async () => {

    const marketOrders = await api.getMarketOrders();

    if (marketOrders.length === 0) return {
        error: "no_market_orders"
    }

    let price;
    let amountToBuy;

    for (let i = 0; i < marketOrders.length; i++) {

        const marketOrder = marketOrders[i];

        const p = parseFloat(marketOrder.pricePerCoin);
        const maxAmount = parseFloat(marketOrder.coinAmount);
        const a = CONFIG.AMOUNT / p;

        if (a <= maxAmount) {
            price = p;
            amountToBuy = a;
            break;
        }

    }

    if (!(price && amountToBuy)) return {
        error: "btc_amount_too_small"
    }

    try {
        const marketOrder = await api.postMarketOrder(amountToBuy);
        return {
            method: "market",
            marketOrder
        }

    } catch (error) {
        return {
            error: "failed_market_order",
            message: error
        }
    }

    
};


const buyViaInstant = async () => {
    
    const instantPrice = (await api.getInstantPrices())[0];

    if (!instantPrice) return {
        error: "no_instant_price"
    }

    const price = parseFloat(instantPrice.buyPricePerCoin);
    const minAmount = parseFloat(instantPrice.minBuy);
    const amountToBuy = parseFloat(CONFIG.AMOUNT) / price;

    if (amountToBuy <= minAmount) return {
        error: "btc_amount_too_small"
    }

    try {
        const instantOrder = await api.placeInstantOrder(amountToBuy, instantPrice.id);
        return {
            method: "instant",
            instantOrder
        }

    } catch (error) {
        return {
            error: "failed_instant_order",
            message: error
        }
    }

};


module.exports = async () => {

    if ( !(await checkIfShouldBuyToday()) ) return;

    let result = await buyViaMarket();

    if (result.error) {
        addErrorToSummary(result);
        result = await buyViaInstant();
    }

    if (result.method) {
        addPurchaseToSummary(result);
    }

};
