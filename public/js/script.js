


function format(n, type) {

    n = parseFloat(n);

    n = n.toFixed(type === 'coin' ? 8 : 2);

    if (type === 'fiat') n = n.toLocaleString();

    return n;
}


const tableBody = document.getElementById('table-body');

fetch("/summary.json")
    .then((res) => res.json())
    .then((res) => {
        console.log(res);

        let tbody = '';
        let totalAmount = 0;
        let totalCost = 0;

        for (let key in res) {

            const item = res[key].purchase;
            if (!item) continue;

            const date = key;
            let amount;
            let cost;
            let price;

            if (item.instantOrder) {
                amount = item.instantOrder.totalCoinAmount;
                price = item.instantOrder.price.buyPricePerCoin;
                cost = parseFloat(amount) * parseFloat(price);

                totalAmount += parseFloat(amount);
                totalCost += parseFloat(cost);
            }

            tbody += `
            <tr>
                <td>${date}</td>
                <td>${format(amount, 'coin')}</td>
                <td>${format(cost, 'fiat')}</td>
                <td>${format(price, 'fiat')}</td>
            </tr>
            `;
        }

        tbody += `
            <tr class="footer">
                <td>&nbsp;</td>
                <td>${format(totalAmount, 'coin')}</td>
                <td>${format(totalCost, 'fiat')}</td>
                <td>&nbsp;</td>
            </tr>
            `;


        tableBody.innerHTML = tbody;


    })
