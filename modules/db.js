const faunadb = require('faunadb');
const q = faunadb.query;

let secrets = {
    FAUNA_DB_SECRET: process.env.FAUNA_DB_SECRET,
};

if (!process.env.FAUNA_DB_SECRET) {
    secrets = require('../secrets');
}

const client = new faunadb.Client({
    secret: secrets.FAUNA_DB_SECRET
});

const DB_COLLECTION_NAME = 'summaries';
const DB_INDEX_ALL_SUMMARIES = 'all_summaries';
const DB_INDEX_SUMMARIES_BY_DATE = 'summaries_by_date';


const setupCollection = () => {

    const createCollection = () => {
        return client.query(
            q.CreateCollection({ name: DB_COLLECTION_NAME})
          )
          .then((ret) => console.log(ret))
          .catch((error) => console.log(error));
    };
    
    const createAllIndex = () => {
        return client.query(
            q.CreateIndex({
                name: DB_INDEX_ALL_SUMMARIES,
                source: q.Collection(DB_COLLECTION_NAME),
                values: [
                    { field: ['data', 'summary_date'] },
                    { field: ['data', 'error_market_order'] },
                    { field: ['data', 'error_instant_order'] },
                    { field: ['data', 'purchase_method'] },
                    { field: ['data', 'purchase_amount'] },
                    { field: ['data', 'purchase_price'] },
                    { field: ['data', 'purchase_id'] }
                ],
            })
        )
        .then((ret) => console.log(ret))
        .catch((error) => console.log(error));
    };

    const createByDateIndex = () => {
        return client.query(
            q.CreateIndex({
                name: DB_INDEX_SUMMARIES_BY_DATE,
                source: q.Collection(DB_COLLECTION_NAME),
                terms: [{ field: ['data', 'summary_date'] }],
                values: [
                    { field: ['data', 'summary_date'] },
                    { field: ['data', 'error_market_order'] },
                    { field: ['data', 'error_instant_order'] },
                    { field: ['data', 'purchase_method'] },
                    { field: ['data', 'purchase_amount'] },
                    { field: ['data', 'purchase_price'] },
                    { field: ['data', 'purchase_id'] }
                ],
            })
        )
        .then((ret) => console.log(ret))
        .catch((error) => console.log(error));
    };

    return createCollection()
        .then(() => createAllIndex())
        .then(() => createByDateIndex());
};

const checkCollectionSetup = () => {
    return client.query(q.Get(q.Collection(DB_COLLECTION_NAME)))
      .then(() => null)
      .catch(() => setupCollection());
};



const addSummaryToDatabase = (summary) => {
    return client.query(
        q.Create(
          q.Collection(DB_COLLECTION_NAME), { data: summary },
        )
      )
      .then((ret) => console.log(ret))
      .catch((error) => console.log(error));
};


const getSummaryByDate = (date) => {
    return checkCollectionSetup().then(() => {
        return client.query(
            q.Paginate(
                q.Match(
                    q.Index(DB_INDEX_SUMMARIES_BY_DATE), date
                )
            )
          )
          .then((ret) => ret.data[0])
          .catch((error) => null);
    });  
};

const getAllSummaries = () => {
    return checkCollectionSetup().then(() => {
        return client.query(
            q.Paginate(
                q.Match(
                    q.Index(DB_INDEX_ALL_SUMMARIES)
                ),
                {
                    size: 99999
                }
            )
        )
        .then((ret) => ret.data)
        .catch((error) => []);
    });  
};


module.exports = {
    getSummaryByDate: getSummaryByDate,
    addSummaryToDatabase: addSummaryToDatabase,
    getAllSummaries: getAllSummaries
}
