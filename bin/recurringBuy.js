#!/usr/bin/env node

"use strict";

const { getMarketOrders } = require('../modules/api');

function handleResult(orders) {
  console.log('HERE');
  console.log(orders);
}

getMarketOrders("BTC/NGNT", handleResult);