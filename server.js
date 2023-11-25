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

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded
app.use("/api/", router);

// const MONGO_URL = 'mongodb://root_user:root_password@localhost:27017';
const MONGO_URL = 'mongodb+srv://sharifrafid:srur2003@cluster0.sc1x6.mongodb.net/?retryWrites=true&w=majority';

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

router.post('/products', upload.single('imageFile'), async (req, res) => {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, });
    try {
        const { name, price, restaurantId } = req.body;
        var imagePath = req.file.filename; // Path to the uploaded file

        const newProduct = new Product({
            name,
            price,
            restaurantId,
            imagePath,
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

router.post('/login', async (req, res) => {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, });
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
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, });
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

router.post('/profile', async (req, res) => {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, });
    try {
        const { name, email, password } = req.body;
        var restaurant = await Restaurant.findOne({ email: email, password: password });
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

router.get('/products', async (req, res) => {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, });
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

router.delete('/products', async (req, res) => {
    await mongoose.connect(MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, });
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

const productSchema = new mongoose.Schema({
    name: String,
    price: String,
    restaurantId: String,
    imagePath: String,
});

const accountSchema = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    restaurantId: String,
});

const orderSchema = new mongoose.Schema({
    name: String,
    phone: String,
    email: String,
    restaurantId: String,
    totalPrice: String,
    products: [{
        name: String,
        imagePath: String,
        price: String,
    }],
});

const Product = mongoose.model('Product', productSchema);
const Restaurant = mongoose.model('Restaurant', accountSchema);
const Order = mongoose.model('Order', orderSchema);

// mongoose.connect('mongodb+srv://sharifrafid:srur2003@cluster0.sc1x6.mongodb.net/?retryWrites=true&w=majority', {
// await mongoose.connect('mongodb://root_user:root_password@localhost:27017', {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// });

const PORT = process.env.PORT || 3200;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

export handler = serverless(app);