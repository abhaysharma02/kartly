const mongoose = require('mongoose');
const Vendor = require('./models/Vendor');
require('dotenv').config();

async function find() {
    await mongoose.connect(process.env.MONGODB_URI);
    const vendor = await Vendor.findOne({ restaurantName: /Gurukripa/i });
    console.log(vendor ? vendor.email : 'Not found');
    process.exit(0);
}
find();
