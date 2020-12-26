
const BigNumber = require('bignumber.js');

const round = (a, type) => {

    a = new BigNumber(a);

    const decimalPlaces = type === 'coin' ? 8 : 2;
    const roundingMode = BigNumber.ROUND_HALF_UP;

    a = a.decimalPlaces(decimalPlaces, roundingMode);

    return a.toFixed();

};



module.exports = {

    round,

    format(a, type) {

        a = round(a, type);
        a = new BigNumber(a);

        const formatOptions = {
            prefix: '',
            decimalSeparator: '.',
            groupSeparator: ',',
            groupSize: 3,
            secondaryGroupSize: 0,
            fractionGroupSeparator: ' ',
            fractionGroupSize: 0,
            suffix: ''
        };

        return a.toFormat(formatOptions);

    },

    add(a, b, type) {
        a = new BigNumber(a || 0);
        b = new BigNumber(b || 0);

        let result = a.plus(b);

        return round(result, type);
    },

    multiply(a, b, type) {
        a = new BigNumber(a || 0);
        b = new BigNumber(b || 0);

        let result = a.multipliedBy(b);

        return round(result, type);
    },

    divide(a, b, type) {
        a = new BigNumber(a || 0);
        b = new BigNumber(b || 0);

        let result = a.dividedBy(b);

        return round(result, type);
    },

    average(arr, type) {
        if (arr.length === 0) return 0;

        const count = new BigNumber(arr.length);
        const sum = BigNumber.sum.apply(null, arr);

        let result = sum.dividedBy(count);

        return round(result, type);
    },

    isGreaterThanOrEqualTo(a, b) {
        a = new BigNumber(a || 0);
        b = new BigNumber(b || 0);

        return a.isGreaterThan(b) || a.isEqualTo(b);
    },

    isLessThanOrEqualTo(a, b) {
        a = new BigNumber(a || 0);
        b = new BigNumber(b || 0);

        return a.isLessThan(b) || a.isEqualTo(b);
    },

};

