const graphqlRequest = require('graphql-request');
const order = require('public-protos-js/proto/orderbook_socket/v1/orderbook_pb');
const OrderBook = order.Orderbook;

let secrets = {
    BUYCOINS_API_PUBLIC: process.env.BUYCOINS_API_PUBLIC,
    BUYCOINS_API_SECRET: process.env.BUYCOINS_API_SECRET,
};

if (!process.env.BUYCOINS_API_PUBLIC) {
    secrets = require('../secrets');
} 

const endpoint = 'https://backend.buycoins.tech/api/graphql';
const authorization = 'Basic ' + Buffer.from(secrets.BUYCOINS_API_PUBLIC  + ':' + secrets.BUYCOINS_API_SECRET).toString('base64');

const graphQLClient = new graphqlRequest.GraphQLClient(endpoint, {
    headers: {
        authorization,
        'Content-Type': 'application/json'
    },
});

module.exports = {

    getInstantPrices: () => {

        const query = `
            query getPrices($cryptocurrency: Cryptocurrency, $side: OrderSide) {
                getPrices(cryptocurrency: $cryptocurrency, side: $side) {
                    id
                    buyPricePerCoin
                    minBuy
                    status
                    cryptocurrency
                }
            }
        `;
    
        const variables = {
            cryptocurrency: "bitcoin",
            side: "buy"
        };
    
        return graphQLClient
            .request(query, variables)
            .then((res) => res.getPrices)
            .catch((error) => {
                const message = error.response && error.response.errors && error.response.errors[0] && error.response.errors[0].message;
                console.error(message);
                return [];
            });
    },

    getMarketOrders: () => {
        
        try {
            const baseUrl = `wss://markets.buycoins.tech/ws?pair=BTC/NGNT`;

            const orderbookSocket = new WebSocket(baseUrl);
            orderbookSocket.binaryType = 'arraybuffer';

            window.orderbookSocket.addEventListener('open', () => {
            console.log('Disconnected from orderbook WebSocket API');
            });

            window.orderbookSocket.addEventListener('close', () => {
            console.log('Disconnected from orderbook WebSocket API. Reconnect will be attempted in 1 second.');
            setTimeout(function() {
                getMarketOrders(pair);
            }, 1000);
            });

            window.orderbookSocket.addEventListener('message', ({ data }) => {
            console.log('Order Book update received');
            const market = OrderBook.deserializeBinary(data).toObject();
            console.log(market);
                    });
        
            // const variables = {
            //     pair: "BTC/USDT",
            // }
        
            const orders = market;
            const sellOrders = orders.filter((o) => o.side === 'sell');
            sellOrders.sort((a, b) => {
                return parseFloat(a.pricePerCoin) - parseFloat(b.pricePerCoin);
                });
            return sellOrders; 
        } catch (error) {
            const message = error.response && error.response.errors && error.response.errors[0] && error.response.errors[0].message;
            console.error(message);
            return [];
        };
        
    },

    postProMarketOrder: (quantity) => {

        const query = `
            mutation postProMarketOrder($pair: CryptocurrencyPair, $quantity: BigDecimal!, $side: OrderSide!) {
                postProMarketOrder(pair: $pair, quantity: $quantity, side: $side){
                    id
                    pair
                    price
                    side
                    status
                    timeInForce
                    orderType
                    fees
                    filled
                    total
                    initialBaseQuantity
                    initialQuoteQuantity
                    remainingBaseQuantity
                    remainingQuoteQuantity
                    meanExecutionPrice
                    engineMessage
                }
            }
            `;
    
        const variables = {
            pair: "btc_usdt",
            side: "sell",
            quantity,
        };
    
        return graphQLClient
            .request(query, variables)
            .then((res) => {
                if (res.postProMarketOrder) return res.postProMarketOrder;
                return Promise.reject();
            })
            .catch((error) => {
                const message = error.response && error.response.errors && error.response.errors[0] && error.response.errors[0].message;
                return Promise.reject(message);
            });

    },

    placeInstantOrder: (coin_amount, price) => {

        const query = `
            mutation buy($cryptocurrency: Cryptocurrency, 
                         $price: ID!, 
                         $coin_amount: BigDecimal!) {
                buy(cryptocurrency: $cryptocurrency, 
                    price: $price, 
                    coin_amount: $coin_amount) {
                    id
                    createdAt
                    cryptocurrency
                    totalCoinAmount
                    price {
                        buyPricePerCoin
                    }
                }
            }
        `;
    
        const variables = {
            cryptocurrency: "bitcoin",
            coin_amount,
            price,
        };
    
        return graphQLClient
            .request(query, variables)
            .then((res) => res.buy)
            .catch((error) => {
                const message = error.response && error.response.errors && error.response.errors[0] && error.response.errors[0].message;
                return Promise.reject(message);
            });

    }

};