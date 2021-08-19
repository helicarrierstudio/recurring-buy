const api = require('./api');
const db = require('./db');

const CONFIG = {
    AMOUNT: process.env.BUY_AMOUNT,
    FREQUENCY: process.env.BUY_FREQUENCY,
    BUY_CURRENCIES: process.env.BUY_CURRENCIES,
};

const getTodaysDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    let month = d.getMonth() + 1;
    if (month < 10) month = `0${month}`;
    let day = d.getDate();
    if (day < 10) day = `0${day}`;

    return `${year}-${month}-${day}`;
};

const checkIfShouldBuyToday = async (allowMultipleBuyOnDay) => {

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

    if (!allowMultipleBuyOnDay && shouldBuyToday) {
        const date = getTodaysDate();
        const summary = await db.getSummaryByDate(date);

        shouldBuyToday = !summary;
    }

    console.log("Should Buy Today:", shouldBuyToday);
    return shouldBuyToday;
};

const buyViaOrderbook = async function(pair) {
    const summary = {};

    try {
        const marketOrder = await api.postProMarketOrder(CONFIG.AMOUNT, pair);
        console.log(marketOrder);

        switch (marketOrder.status) {
            case 'successful':
            case 'pending':
            case 'in_progress':
            case 'partially_filled':
                summary.purchase_method = "market";
                summary.purchase_amount = marketOrder.initialQuoteQuantity;
                summary.purchase_price = marketOrder.meanExecutionPrice;
                summary.purchase_pair = marketOrder.pair;
                summary.purchase_fees = marketOrder.fees;
                summary.purchase_status = marketOrder.status;
                break;
            case 'failed':
            case 'cancelled':
                summary.error = "failed_market_order";
                summary.messgae = marketOrder.engineMessage;
                break;
        }
    } catch (error) {
        summary.error = "failed_market_order";
        summary.messgae = error;
    }

    return summary;
}


module.exports = async (allowMultipleBuyOnDay) => {

    console.log("Starting recurringBuy");
    console.log(CONFIG);

    if (!CONFIG.AMOUNT || !CONFIG.FREQUENCY) return console.error("missing configuration");

    if ( !(await checkIfShouldBuyToday(allowMultipleBuyOnDay)) ) return;

    let pairs = [];

    if (CONFIG.BUY_CURRENCIES) {
        CONFIG.BUY_CURRENCIES.split(",").forEach((baseCurrency) => {
            pairs.push(`${baseCurrency.toLowerCase()}_ngnt`);
        });
    } else {
        pairs.push('btc_ngnt');
    }

    for (let i = 0; i < pairs.length; i++) {
        const summary = await buyViaOrderbook(pairs[i]);
        summary.date = getTodaysDate();
        try {
            await db.addSummaryToDatabase(summary);
        } catch (error) {}
        console.log(summary);
    }

};
