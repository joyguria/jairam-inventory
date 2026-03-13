const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const app = express();

app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

// API prefix
const API_PREFIX = process.env.API_PREFIX || '/api';

// Import Amin routes
const user = require('./routes/user.route.js');
app.use(`${API_PREFIX}/user`, user);

const investor = require('./routes/investor.route.js');
app.use(`${API_PREFIX}/investor`, investor);

const tank = require('./routes/tank.route.js');
app.use(`${API_PREFIX}/tank`, tank);

const supplier = require('./routes/supplier.route.js');
app.use(`${API_PREFIX}/supplier`, supplier);

const driver = require('./routes/driver.route.js')
app.use(`${API_PREFIX}/driver`, driver);

const vehicle = require('./routes/vehicle.route.js');
app.use(`${API_PREFIX}/vehicle`, vehicle);

const customer = require('./routes/customer.route.js');
app.use(`${API_PREFIX}/customer`, customer);

const purchase = require('./routes/purchase.route.js');
app.use(`${API_PREFIX}/purchase`, purchase);

const order = require('./routes/order.route.js');
app.use(`${API_PREFIX}/order`, order);

const wallet = require('./routes/wallet.route.js');
app.use(`${API_PREFIX}/wallet`, wallet);

const dashboard = require('./routes/dashboard.route.js');
app.use(`${API_PREFIX}/dashboard`, dashboard);

const address = require('./routes/address.route.js');
app.use(`${API_PREFIX}/address`, address);

const bank = require('./routes/bank.route.js');
app.use(`${API_PREFIX}/bank`, bank);

const investment = require('./routes/investment.route.js');
app.use(`${API_PREFIX}/investment`, investment);

// Health check endpoint
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

app.use((req, res, next) => {
  console.log('Request path:', req.path);
  console.log('Request method:', req.method);
  next();
});

module.exports = app;


// routes/financeRoutes.js
// const express = require('express');
// const router = express.Router();

// // Import your controller
// const { getBalance } = require('../controllers/financeController');

// // Define a GET route that uses your controller
// router.get('/current-balance', getBalance);

// module.exports = router;