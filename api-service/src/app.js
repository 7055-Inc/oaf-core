// Import routes
const eventsRoutes = require('./routes/events');
const usersRoutes = require('./routes/users');
const applicationsRoutes = require('./routes/applications');
const cartsRoutes = require('./routes/carts');
const checkoutRoutes = require('./routes/checkout');
const productsRoutes = require('./routes/products');
const emailsRoutes = require('./routes/emails');
const adminRoutes = require('./routes/admin');
const webhooksRoutes = require('./routes/webhooks');
const seriesRoutes = require('./routes/series'); // Add series routes

// Use routes
app.use('/api/events', eventsRoutes);
app.use('/users', usersRoutes);
app.use('/api/applications', applicationsRoutes);
app.use('/carts', cartsRoutes);
app.use('/checkout', checkoutRoutes);
app.use('/products', productsRoutes);
app.use('/emails', emailsRoutes);
app.use('/admin', adminRoutes);
app.use('/webhooks', webhooksRoutes);
app.use('/api/series', seriesRoutes); // Add series route 