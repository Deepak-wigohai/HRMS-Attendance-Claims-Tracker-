const app = require("./app");
const dotenv = require("dotenv");
const http = require('http');
const { initRealtime } = require('./realtime');
const { initSchedulers } = require('./scheduler');

dotenv.config();

require("./config/db");

const PORT = process.env.PORT || 5000;
const server = http.createServer(app);
initRealtime(server);
initSchedulers();
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
