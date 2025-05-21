const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const app = next({ dev: false, hostname: 'main.onlineartfestival.com', port: 3000 });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  }).listen(process.env.PORT || 3000, (err) => {
    if (err) throw err;
    console.log('> Main app running on http://main.onlineartfestival.com:3000');
  });
}); 