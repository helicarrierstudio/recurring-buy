const api = require('./api');
const db = require('./db');
const bn = require('./big-number');
const order = require('public-protos-js/proto/orderbook_socket/v1/orderbook_pb');
const OrderBook = order.Orderbook;
const WebSocket = require('ws');

const CONFIG = {
    AMOUNT: process.env.BUY_AMOUNT,
    FREQUENCY: process.env.BUY_FREQUENCY,
};


const getTodaysDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const day = d.getDate();

    return `${year}-${month}-${day}`;
};

const checkIfShouldBuyToday = async (allowMultipeBuyOnDay) => {

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

    if (!allowMultipeBuyOnDay && shouldBuyToday) {
        const date = getTodaysDate();
        const summary = await db.getSummaryByDate(date); 

        shouldBuyToday = !summary;
    }

    console.log("Should Buy Today:", shouldBuyToday);
    return shouldBuyToday;
};

async function Market(marketOrders) {

    if (marketOrders.length === 0) return {
        error: "no_market_orders"
    }
    
    let price;
    let amountToBuy;

    for (let i = 0; i < marketOrders.length; i++) {

        const marketOrder = marketOrders[i];

        const p = marketOrder.price;
        const maxAmount = marketOrder.quantity;
        const a = bn.divide(CONFIG.AMOUNT, p, 'coin');
        console.log(a)

        if (bn.isLessThanOrEqualTo(a, maxAmount)) {
            price = p;
            amountToBuy = a;
            console.log('Gotten amount', amountToBuy)
            break;
        }

    }

    if (!(price && amountToBuy)) return {
        error: "btc_amount_too_small"
    }
    try {
        const marketOrder = await api.postProMarketOrder(CONFIG.AMOUNT);
        console.log(marketOrder);
              
        const summary = {
            purchase_date: getTodaysDate(),
            purchase_method: "market",
            purchase_amount: amountToBuy,
            purchase_price: marketOrder.initialQuoteQuantity,
            purchase_pair: marketOrder.pair
    }
        console.log(summary);
        db.addSummaryToDatabase(summary);
        return {
            summary
        }

    } catch (error) {
        console.log("failed_market_order");
        summary.error_market_order = `${result.error}:${result.message || ''}`;
        result = buyViaInstant();
        if (result.error) summary.error_instant_order = `${result.error}:${result.message || ''}`;
    
    }
}

const buyViaMarket = async () => {

    
 
};

const buyViaInstant = async () => {
    
    const instantPrice = (await api.getInstantPrices())[0];

    if (!instantPrice) return {
        error: "no_instant_price"
    }

    const price = instantPrice.buyPricePerCoin;
    const minAmount = instantPrice.minBuy;
    const amountToBuy = bn.divide(CONFIG.AMOUNT, price, 'coin');

    if (bn.isLessThanOrEqualTo(amountToBuy, minAmount)) return {
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


module.exports = async (allowMultipeBuyOnDay) => {

    if (!CONFIG.AMOUNT || !CONFIG.FREQUENCY) return console.error("missing configuration");

    if ( !(await checkIfShouldBuyToday(allowMultipeBuyOnDay)) ) return;

    
    var summarily;
    pair = 'BTC/NGNT'
    const baseUrl = `wss://markets.buycoins.tech/ws?pair=${pair}`;

    const orderbookSocket = new WebSocket(baseUrl);
    orderbookSocket.binaryType = 'arraybuffer';
    console.log('GOT HERE');

    orderbookSocket.addEventListener('open', async () => {
    console.log('Connected to orderbook WebSocket API');
    });

    orderbookSocket.addEventListener('message', ({ data }) => {
    console.log('Order Book update received');
    const market = OrderBook.deserializeBinary(data).toObject();

    const orders = market.asksList;
    var bestPrice;
    if (orders.length === 0) {
        console.log('We are done here');
    } else {
        bestPrice = orders.sort((a, b) => {
        return parseFloat(a.price) - parseFloat(b.price);
        });
    }  
    summarily = Market(bestPrice);
    orderbookSocket.terminate();
    
    });
    

    return summarily;

};
