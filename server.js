const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); // Import the 'cors' package
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const serverless = require('serverless-http');

const app = express();
const router = express.Router();
const PORT = process.env.PORT || 3200;
const ObjectId = mongoose.Types.ObjectId;

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use("/api/", router);

const MONGO_URL = 'mongodb://root_user:root_password@localhost:27017';
// const MONGO_URL = 'mongodb+srv://sharifrafid:srur2003@cluster0.sc1x6.mongodb.net/?retryWrites=true&w=majority';

router.get("/hello", (req, res) => res.send("Hello World!"));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/'); // Set your destination folder
    },
    filename: (req, file, cb) => {
        cb(null, String(new Date().getTime()) + file.originalname);
    },
});
const upload = multer({ storage });

router.post('/cartProducts', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password } = req.body;
        const customer = await Customer.findOne({ email: email, password: password });
        if (customer) {
            const productIds = customer.cart.map(product => new ObjectId(product));
            const productsInCart = await Product.find({ _id: { $in: productIds } });
            res.status(200).json(productsInCart);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error getting products from cart' });
    }
});

router.post('/addCartProduct', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password, productId } = req.body;
        const products = await Customer.findOne({ email: email, password: password });
        if (products) {
            if (!products.cart.includes(productId)) {
                products.cart.push(productId);
                await products.save();
            }
            const productIds = products.cart.map(product => new ObjectId(product));
            const productsInCart = await Product.find({ _id: { $in: productIds } });
            res.status(200).json(productsInCart);
        } else {
            res.status(500).json({ message: 'Error getting product' });
        }
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error getting product' });
        return;
    }
});

router.post('/removeCartProduct', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password, productId } = req.body;
        const customer = await Customer.findOne({ email: email, password: password });
        if (customer) {
            customer.cart = customer.cart.filter(product => product !== productId);
            await customer.save();
            const productIds = customer.cart.map(product => new ObjectId(product));
            const productsInCart = await Product.find({ _id: { $in: productIds } });
            res.status(200).json(productsInCart);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing product from cart' });
    }
});

router.post('/wishListProducts', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password } = req.body;
        const customer = await Customer.findOne({ email: email, password: password });
        if (customer) {
            const productIds = customer.wishList.map(product => new ObjectId(product));
            const productsInCart = await Product.find({ _id: { $in: productIds } });
            res.status(200).json(productsInCart);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error getting products from cart' });
    }
});

router.post('/placeOrder', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password, restaurantId, totalPrice, tableName, tableId } = req.body;
        const customer = await Customer.findOne({ email: email, password: password });
        const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });

        if (customer) {
            const productIds = customer.cart.map(product => new ObjectId(product));
            const productsInWishlist = await Product.find({ _id: { $in: productIds } });

            // Prepare order details based on wishlist products
            const orderProducts = productsInWishlist.map(product => ({
                name: product.name,
                imagePath: product.imagePath,
                price: product.price,
                shortDescription: product.shortDescription,
                description: product.description,
            }));

            const totalPrice = productsInWishlist.reduce((total, product) => total + parseFloat(product.price), 0).toString();

            // Create the order
            const newOrder = new Order({
                name: customer.name,
                phone: '',
                email: customer.email,
                restaurantId: restaurantId,
                totalPrice: totalPrice,
                customerId: customer._id, // Assuming customer._id is the MongoDB ObjectId
                products: orderProducts,
                tableName: tableName,
                tableId: tableId,
                wifiPass: restaurant.wifiPass,
            });

            // Save the order to the database
            await newOrder.save();

            // Clear the wishlist after placing the order
            customer.cart = [];
            await customer.save();

            res.status(200).json({ message: 'Order placed successfully', order: newOrder });
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error placing order' });
    }
});

router.post('/addWishListProduct', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password, productId } = req.body;
        const products = await Customer.findOne({ email: email, password: password });
        if (products) {
            if (!products.wishList.includes(productId)) {
                products.wishList.push(productId);
                await products.save();
            }
            const productIds = products.wishList.map(product => new ObjectId(product));
            const productsInCart = await Product.find({ _id: { $in: productIds } });
            res.status(200).json(productsInCart);
        } else {
            res.status(500).json({ message: 'Error getting product' });
        }
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error getting product' });
        return;
    }
});

router.post('/removeWishListProduct', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password, productId } = req.body;
        const customer = await Customer.findOne({ email: email, password: password });
        if (customer) {
            customer.wishList = customer.wishList.filter(product => product !== productId);
            await customer.save();
            const productIds = customer.wishList.map(product => new ObjectId(product));
            const productsInCart = await Product.find({ _id: { $in: productIds } });
            res.status(200).json(productsInCart);
        } else {
            res.status(404).json({ message: 'Customer not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error removing product from cart' });
    }
});

router.post('/login', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password } = req.body;
        var restaurant = await Restaurant.findOne({ email: email });
        if (restaurant) {
            if (restaurant.password == password) {
                res.status(201).json(restaurant);
                return;
            } else {
                res.status(403).json({ "message": "Wrong Password" });
                return;
            }
        } else {
            res.status(403).json({ "message": "Not signed up" });
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error logging in' });
        return;
    }
});

router.post('/signup', async (req, res) => {
    await mongoConnect();
    try {
        const { name, email, password } = req.body;
        var restaurant = await Restaurant.findOne({ email: email });
        if (restaurant) {
            res.status(403).json({ "message": "Already Registered. Please Login." });
            return;
        } else {
            const idName = uuidv4();
            restaurant = new Restaurant({
                name: name,
                email: email,
                password: password,
                restaurantId: idName,
            });
            await restaurant.save();
            res.status(201).json(restaurant);
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(403).json({ message: 'Error signing up' });
        return;
    }
});

router.post('/login-consumer', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password } = req.body;
        var restaurant = await Customer.findOne({ email: email });
        if (restaurant) {
            if (restaurant.password == password) {
                res.status(201).json(restaurant);
                return;
            } else {
                res.status(403).json({ "message": "Wrong Password" });
                return;
            }
        } else {
            res.status(403).json({ "message": "Not signed up" });
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error logging in' });
        return;
    }
});

router.post('/signup-consumer', async (req, res) => {
    await mongoConnect();
    try {
        const { name, email, password } = req.body;
        var restaurant = await Customer.findOne({ email: email });
        if (restaurant) {
            res.status(403).json({ "message": "Already Registered. Please Login." });
            return;
        } else {
            const idName = uuidv4();
            restaurant = new Customer({
                name: name,
                email: email,
                password: password,
                restaurantId: idName,
            });
            await restaurant.save();
            res.status(201).json(restaurant);
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(403).json({ message: 'Error signing up' });
        return;
    }
});

router.post('/profile-consumer', async (req, res) => {
    await mongoConnect();
    try {
        const { name, email, password } = req.body;
        var restaurant = await Customer.findOne({ email: email, password: password });
        if (restaurant) {
            restaurant.name = name;
            await restaurant.save();
            res.status(201).json(restaurant);
            return;
        } else {
            res.status(403).json({ message: 'Error updating' });
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(403).json({ message: 'Error signing up' });
        return;
    }
});

router.post('/login-admin', async (req, res) => {
    await mongoConnect();
    try {
        const { email, password } = req.body;
        var restaurant = await Admin.findOne({ email: email });
        if (restaurant) {
            if (restaurant.password == password) {
                res.status(201).json(restaurant);
                return;
            } else {
                res.status(403).json({ "message": "Wrong Password" });
                return;
            }
        } else {
            res.status(403).json({ "message": "Not signed up" });
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error logging in' });
        return;
    }
});

router.post('/signup-admin', async (req, res) => {
    await mongoConnect();
    try {
        const { name, email, password } = req.body;
        var restaurant = await Admin.findOne({ email: email });
        if (restaurant) {
            res.status(403).json({ "message": "Already Registered. Please Login." });
            return;
        } else {
            const idName = uuidv4();
            restaurant = new Admin({
                name: name,
                email: email,
                password: password
            });
            await restaurant.save();
            res.status(201).json(restaurant);
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(403).json({ message: 'Error signing up' });
        return;
    }
});

router.post('/profile', async (req, res) => {
    await mongoConnect();
    try {
        const { name, email, password, wifiPass } = req.body;
        var restaurant = await Restaurant.findOne({ email: email, password: password });
        if (restaurant) {
            restaurant.name = name;
            restaurant.wifiPass = wifiPass;
            await restaurant.save();
            res.status(201).json(restaurant);
            return;
        } else {
            res.status(403).json({ message: 'Error updating' });
            return;
        }
    } catch (error) {
        console.log(error);
        res.status(403).json({ message: 'Error signing up' });
        return;
    }
});

router.get('/products', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.restaurantId) {
            const products = await Product.find({ restaurantId: req.query.restaurantId });
            res.json(products);
            return;
        } else {
            const products = await Product.find();
            res.json(products);
            return;
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
});

router.post('/products', upload.single('imageFile'), async (req, res) => {
    await mongoConnect();
    try {
        const { name, price, restaurantId, shortDescription, description } = req.body;
        var imagePath = req.file.filename; // Path to the uploaded file

        const restaurant = await Restaurant.findOne({ restaurantId: restaurantId });

        if (restaurant.isActive != true) {
            res.status(500).json({ message: 'Restaurant Is Deactivated' });
            return;
        }

        const newProduct = new Product({
            name,
            price,
            restaurantId,
            imagePath,
            shortDescription,
            description
        });

        await newProduct.save();

        res.status(201).json(newProduct);
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating product' });
        return;
    }
});

router.get('/orders', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.restaurantId) {
            const products = await Order.find({ restaurantId: req.query.restaurantId });
            res.json(products);
            return;
        } else {
            const products = await Order.find();
            res.json(products);
            return;
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

router.delete('/products', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.id) {
            const product = await Product.findById(req.query.id);
            if (product) {
                await product.deleteOne();
                res.status(201).json({ message: 'Success' });
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting products' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting products' });
    }
});

router.post('/add-restaurant', upload.single('imageFile'), async (req, res) => {
    await mongoConnect();
    try {
        const { name, email, password, shortDescription, description } = req.body;
        var imagePath = req.file.filename; // Path to the uploaded file

        var restaurantId = uuidv4();

        const newProduct = new Restaurant({
            name,
            email,
            password,
            restaurantId,
            imagePath,
            shortDescription,
            description,
            isActive: true,
        });

        await newProduct.save();

        res.status(201).json(newProduct);
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating product' });
        return;
    }
});

router.post('/update-restaurant', upload.single('imageFile'), async (req, res) => {
    await mongoConnect();
    try {
        const { id, name, email, password, shortDescription, description } = req.body;

        var imagePath = null

        if (req.file) {
            imagePath = req.file.filename; // Path to the uploaded file
        }

        const product = await Restaurant.findById(id);

        product.name = name;
        product.email = email;
        product.password = password;
        product.shortDescription = shortDescription;
        product.description = description;
        if (imagePath) {
            product.imagePath = imagePath;
        }
        await product.save();

        const products = await Restaurant.find();

        res.status(201).json(products);
        return;
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating product' });
        return;
    }
});

router.delete('/restaurants', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.id) {
            const product = await Restaurant.findById(req.query.id);
            if (product) {
                await product.deleteOne();
                res.status(201).json({ message: 'Success' });
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting restaurants' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting restaurants' });
    }
});

router.get('/restaurants', async (req, res) => {
    await mongoConnect();
    try {
        const products = await Restaurant.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching orders' });
    }
});

router.post('/restaurants-set-active', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.id) {
            const product = await Restaurant.findById(req.query.id);
            if (product) {
                if (product.isActive) {
                    product.isActive = false;
                    await product.save();
                } else {
                    product.isActive = true;
                    await product.save();
                }
                const products = await Restaurant.find();
                res.status(201).json(products);
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting restaurants' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting restaurants' });
    }
});

router.post('/restaurants-set-active', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.id) {
            const product = await Restaurant.findById(req.query.id);
            if (product) {
                if (product.isActive) {
                    product.isActive = false;
                    await product.save();
                } else {
                    product.isActive = true;
                    await product.save();
                }
                const products = await Restaurant.find();
                res.status(201).json(products);
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting restaurants' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting restaurants' });
    }
});

router.post('/update-order-status', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.id) {
            const item = await Order.findById(req.query.id);
            if (item) {
                item.orderStatus = req.query.status;
                await item.save();
                res.status(201).json(item);
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting restaurants' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting restaurants' });
    }
});

router.post('/res-tables', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.id) {
            const item = await Restaurant.findOne({
                "restaurantId": req.query.id
            });
            if (item) {
                if (!item.tables.includes({ name: req.query.name, num: req.query.num })) {
                    item.tables.push({ name: req.query.name, num: req.query.num });
                }
                await item.save();
                res.status(201).json(item);
                return;
            }
        }
        res.status(500).json({ message: 'Error tables' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error tables' });
    }
});

router.delete('/delete-tables', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.id) {
            const item = await Restaurant.findOne({
                "restaurantId": req.query.id
            });
            if (item) {
                var tables = item.tables
                const index = tables.findIndex(table => table.name === req.query.name && table.num === req.query.num);
                if (index > -1) {
                    tables.splice(index, 1);
                }
                item.tables = tables;
                await item.save();
                res.status(201).json(tables);
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting tables' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting tables' });
    }
});


router.get('/tables', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.restaurantId) {
            const item = await Restaurant.findOne({ restaurantId: req.query.restaurantId });
            if (item) {
                var tables = item.tables;
                const orders = await Order.find({ restaurantId: req.query.restaurantId });
                orders.forEach(oItm => {
                    if (oItm.orderStatus != "COMPLETE") {
                        var index = tables.findIndex(item => item.name === oItm.tableName && item.num === oItm.tableId);
                        if (index > -1) {
                            tables.splice(index, 1);
                        }
                    }
                })
                res.status(201).json(tables);
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting tables' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting tables' });
    }
});

router.get('/restaurantData', async (req, res) => {
    await mongoConnect();
    try {
        if (req.query.restaurantId) {
            const item = await Restaurant.findOne({ restaurantId: req.query.restaurantId });
            if (item) {
                res.status(201).json(item);
                return;
            }
        }
        res.status(500).json({ message: 'Error deleting tables' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error deleting tables' });
    }
});

const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    restaurantId: String,
    imagePath: String,
    shortDescription: String,
    description: String,
});

const accountSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    restaurantId: String,
    imagePath: String,
    shortDescription: String,
    description: String,
    isActive: Boolean,
    wifiPass: String,
    tables: [{
        name: String,
        num: String
    }],
});

const customerSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    phone: String,
    cart: [String],
    wishList: [String],
});

const orderSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: String,
    restaurantId: String,
    totalPrice: String,
    customerId: String,
    tableName: String,
    tableId: String,
    orderStatus: String,
    wifiPass: String,
    products: [{
        name: String,
        imagePath: String,
        price: String,
        shortDescription: String,
        description: String,
    }],
});

const adminSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
});

const Product = mongoose.model('Product', productSchema);
const Restaurant = mongoose.model('Restaurant', accountSchema);
const Order = mongoose.model('Order', orderSchema);
const Customer = mongoose.model('Customer', customerSchema);
const Admin = mongoose.model('Admin', adminSchema);

async function mongoConnect() {
    if (mongoose.connection.readyState == 0) {
        await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, });
    }
}

async function startServer() {
    await mongoConnect();
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}

startServer();