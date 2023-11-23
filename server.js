const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const cors = require('cors'); // Import the 'cors' package
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');

const app = express();

app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.json()); // For parsing application/json
app.use(bodyParser.urlencoded({ extended: true })); // For parsing application/x-www-form-urlencoded

// Define a product schema
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

const Product = mongoose.model('Product', productSchema);
const Restaurant = mongoose.model('Restaurant', accountSchema);

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/'); // Set your destination folder
    },
    filename: (req, file, cb) => {
        cb(null, String(new Date().getTime()) + file.originalname);
    },
});

const upload = multer({ storage });

// Endpoint to handle product creation
app.post('/api/products', upload.single('imageFile'), async (req, res) => {
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
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error creating product' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { name, email, password } = req.body;
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
            const idName = uuidv4();
            restaurant = new Restaurant({
                name: name,
                email: email,
                password: password,
                restaurantId: idName,
            });
            await restaurant.save();
            res.status(201).json(restaurant);
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Error logging in' });
    }
});

app.get('/api/products', async (req, res) => {
    try {
        if (req.params.restaurantId) {
            const products = await Product.find({ restaurantId: req.params.restaurantId });
            res.json(products);
        } else {
            const products = await Product.find();
            res.json(products);
        }
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
});
// Connect to MongoDB
mongoose.connect('mongodb+srv://sharifrafid:srur2003@cluster0.sc1x6.mongodb.net/?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {
    const PORT = process.env.PORT || 3200;
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
});
