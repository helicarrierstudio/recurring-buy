const api = require('./api');
const db = require('./db');

const CONFIG = {
    AMOUNT: process.env.CONFIG_AMOUNT || 12000,
    FREQUENCY: process.env.CONFIG_FREQUENCY || 'DAILY', // DAILY, WEEKLY_[1-7], MONTHLY_[1-29]
};

const getTodaysDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    return `${year}-${month}-${day}`;
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
        const date = getTodaysDate();
        const summary = await db.getSummaryByDate(date); 

        shouldBuyToday = !summary;
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
            purchase_method: "market",
            purchase_amount: marketOrder.coinAmount,
            purchase_price: marketOrder.pricePerCoin,
            purchase_id: marketOrder.id
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
            purchase_method: "instant",
            purchase_amount: instantOrder.totalCoinAmount,
            purchase_price: instantOrder.price.buyPricePerCoin,
            purchase_id: instantOrder.id
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

    const summary = {
        summary_date: getTodaysDate()
    };

    let result = await buyViaMarket();
    if (result.error) {
        summary.error_market_order = `${result.error}:${result.message}`;
        result = await buyViaInstant();
        if (result.error) summary.error_instant_order = `${result.error}:${result.message}`;
    }

    if (result.purchase_method) {
        summary.purchase_method = result.purchase_method,
        summary.purchase_amount = result.purchase_amount,
        summary.purchase_price = result.purchase_price,
        summary.purchase_id = result.purchase_id
    }

    db.addSummaryToDatabase(summary);

};
