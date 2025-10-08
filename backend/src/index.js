const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const deadtimes = require('./routes/deadtimes');

dotenv.config();
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.use('/api/deadtimes', deadtimes);

const PORT = process.env.PORT || 8700;
app.listen(PORT, '0.0.0.0', () => console.log(`Deadtimes API on ${PORT}`));
