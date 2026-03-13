const app = require('./app');
const connectDB = require("./config/db");

const PORT = process.env.PORT || 4000;

connectDB();

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});