const graphqlRequest = require('graphql-request');

// const secrets = require('../secrets');
const secrets = {
    public: process.env.BUYCOINS_API_PUBLIC,
    secret: process.env.BUYCOINS_API_SECRET,
};

const endpoint = 'https://backend.buycoins.tech/api/graphql';
const authorization = 'Basic ' + Buffer.from(secrets.public  + ':' + secrets.secret).toString('base64');

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

        const query = `
            query getMarketBook($cryptocurrency: Cryptocurrency) {
                getMarketBook(cryptocurrency: $cryptocurrency) {
        
                    orders(first: 10) {
                      
                      nodes {
                        id
                        coinAmount
                        pricePerCoin
                        side
    
                      }
                    }
                    
                    
                  }
            }
        `;
    
        const variables = {
            cryptocurrency: "bitcoin",
        }
    
        return graphQLClient
            .request(query, variables)
            .then((res) => {
                const orders = res.getMarketBook.orders.nodes;
                const sellOrders = orders.filter((o) => o.side === 'sell');
                sellOrders.sort((a, b) => {
                    return parseFloat(a.pricePerCoin) - parseFloat(b.pricePerCoin);
                });
                return sellOrders; 
            })
            .catch((error) => {
                const message = error.response && error.response.errors && error.response.errors[0] && error.response.errors[0].message;
                console.error(message);
                return [];
            });
    },

    postMarketOrder: (coinAmount) => {

        const query = `
            mutation postMarketOrder($cryptocurrency: Cryptocurrency, $orderSide: OrderSide!, $coinAmount: BigDecimal!) {
                postMarketOrder(cryptocurrency: $cryptocurrency, orderSide: $orderSide, coinAmount: $coinAmount) {
                    id
                }
            }
        `;
    
        const variables = {
            cryptocurrency: "bitcoin",
            orderSide: "sell",
            coinAmount,
        };
    
        return graphQLClient
            .request(query, variables)
            .then((res) => res.postMarketOrder)
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
                    filledCoinAmount
                    price {
                        buyPricePerCoin
                    }
                    side
                    status
                    totalCoinAmount

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