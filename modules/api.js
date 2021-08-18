const graphqlRequest = require('graphql-request');
const order = require('public-protos-js/proto/orderbook_socket/v1/orderbook_pb');
const OrderBook = order.Orderbook;
const WebSocket = require('ws');

let secrets = {
  BUYCOINS_API_PUBLIC: process.env.BUYCOINS_API_PUBLIC,
  BUYCOINS_API_SECRET: process.env.BUYCOINS_API_SECRET,
};

if (!process.env.BUYCOINS_API_PUBLIC) {
  secrets = require('../secrets');
}

const endpoint = 'https://backend.buycoins.tech/api/graphql';
const authorization =
  'Basic ' +
  Buffer.from(
    secrets.BUYCOINS_API_PUBLIC + ':' + secrets.BUYCOINS_API_SECRET
  ).toString('base64');

const graphQLClient = new graphqlRequest.GraphQLClient(endpoint, {
  headers: {
    authorization,
    'Content-Type': 'application/json',
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
      cryptocurrency: 'bitcoin',
      side: 'buy',
    };

    return graphQLClient
      .request(query, variables)
      .then((res) => res.getPrices)
      .catch((error) => {
        const message =
          error.response &&
          error.response.errors &&
          error.response.errors[0] &&
          error.response.errors[0].message;
        console.error(message);
        return [];
      });
  },

  getMarketOrders: (pair = 'BTC/NGNT', callback = nil) => {
    try {
      const baseUrl = `wss://markets.buycoins.tech/ws?pair=${pair}`;

      const orderbookSocket = new WebSocket(baseUrl);
      orderbookSocket.binaryType = 'arraybuffer';
      console.log('GOT HERE');

      orderbookSocket.addEventListener('open', () => {
        console.log('Disconnected from orderbook WebSocket API');
      });

      orderbookSocket.addEventListener('message', ({ data }) => {
        console.log('Order Book update received');
        const market = OrderBook.deserializeBinary(data).toObject();
        console.log(market);

        const orders = market.asksList;
        if (orders.length === 0) {
          callback(null);
        } else {
          const bestPrice = orders.sort((a, b) => {
            return parseFloat(a.price) - parseFloat(b.price);
          });

          callback(bestPrice);
          orderbookSocket.terminate();
        }
      });
    } catch (error) {
      console.log(error);
      const message =
        error.response &&
        error.response.errors &&
        error.response.errors[0] &&
        error.response.errors[0].message;
      console.error(message);
      return [];
    }
  },

  postProMarketOrder: (quantity, pair) => {
    const query = `
            mutation postProMarketOrder($pair: Pair!, $quantity: BigDecimal!, $side: OrderSide!) {
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
      pair: pair,
      side: 'buy',
      quantity,
    };

    return graphQLClient
      .request(query, variables)
      .then((res) => {
        if (res.postProMarketOrder) return res.postProMarketOrder;
        return Promise.reject();
      })
      .catch((error) => {
          console.log(error);
        const message =
          error.response &&
          error.response.errors &&
          error.response.errors[0] &&
          error.response.errors[0].message;
        return Promise.reject(message);
      });
  },

  getProOrders: () => {
    const query = `
    query getProOrders($pair: Pair!, $status: ProOrderStatus!, $side: OrderSide!) {
    getProOrders(pair: $pair, status: $status, side: $side) {
          edges {
            node {
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
        }
      }`;

    const variables = {
      pair: 'btc_ngnt',
      side: 'buy',
      status: 'successful',
    };

    return graphQLClient
      .request(query, variables)
      .then((res) => {
        if (res.getProOrders) return res.getProOrders;
        return Promise.reject();
      })
      .catch((error) => {
          console.log(error);
        const message =
          error.response &&
          error.response.errors &&
          error.response.errors[0] &&
          error.response.errors[0].message;
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
      cryptocurrency: 'bitcoin',
      coin_amount,
      price,
    };

    return graphQLClient
      .request(query, variables)
      .then((res) => res.buy)
      .catch((error) => {
        const message =
          error.response &&
          error.response.errors &&
          error.response.errors[0] &&
          error.response.errors[0].message;
        return Promise.reject(message);
      });
  },
};
