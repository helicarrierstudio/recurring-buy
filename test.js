process.env.BUY_AMOUNT = 12000;
process.env.BUY_FREQUENCY = 'DAILY';

const recurringBuy = require('./modules/recurring-buy');

(async () => {
    
    await recurringBuy();
    
})();
