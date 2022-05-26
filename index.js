const express = require('express')
const app = express()
const cors = require('cors')
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { send } = require('express/lib/response');
require('dotenv').config();
const stripe =require('stripe')(process.env.STRIPE_KEY)
const port = process.env.PORT || 5000;
app.use(cors())
app.use(express.json())



function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    console.log(token)
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next();
    });
}











const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.x8cmc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
async function run() {
    try {
        await client.connect();
        const database = client.db("assignmentTwelve");
        const manufacturerTools = database.collection("manufacturerTools");
        const userCollection = database.collection("user");
        const orderCollection = database.collection("order");
        const reviewCollection = database.collection("reviews");
        const paymentCollection = database.collection('payments');
        const blogCollection = database.collection('blogs');
        const profileCollection = database.collection('profile');


        app.get('/tools', async (req, res) => {
            const tools = await manufacturerTools.find().toArray()
            res.send(tools);
        })
        app.post('/tools', async (req, res) => {
            const addNewProduct = req.body;
            //   console.log(review)
            const result = await manufacturerTools.insertOne(addNewProduct);
            res.send(result)
        })
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await userCollection.find().toArray()
            res.send(users);
        })
        app.get('/blogs', async (req, res) => {
            const blogs = await blogCollection.find().toArray()
            res.send(blogs);
        })
        app.get('/orders', async (req, res) => {
            const orders = await orderCollection.find().toArray()
            res.send(orders);
        })

        app.get('/review', async (req, res) => {
            const review = await reviewCollection.find().toArray();
            res.send(review)
        })


        app.get('/profile/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email};
            console.log(email, "query" , query)
            const profile = await profileCollection.findOne(query);
            res.send(profile)
        })


        app.get('/tools/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await manufacturerTools.findOne(query);
            res.send(tool)
        })
        app.get('/blogs/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await blogCollection.findOne(query);
            res.send(tool)
        })


        app.get('/payment/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const tool = await orderCollection.findOne(query);
            res.send(tool)
        })

        app.get('/myorder', verifyJWT, async (req, res) => {
            const email = req.query.email;

            //   console.log('auth Header',authorization);
            const decodedEmail = req.decoded.email;
            if (email === decodedEmail) {
                const query = { email: email };
                const myOrders = await orderCollection.find(query).toArray();
                return res.send(myOrders);
            } else {
                return res.status(403).send({ message: 'forbidden access' });
            }

        })


        app.patch('/myorder/:id', verifyJWT, async(req, res) =>{
            const id  = req.params.id;
            const payment = req.body;
            const filter = {_id: ObjectId(id)};
            const updatedDoc = {
              $set: {
                paid: true,
                transactionId: payment.transactionId
              }
            }
      
            const result = await paymentCollection.insertOne(payment);
            const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
            res.send(updatedOrder);
          })
        app.put('/updateStatus/:id', verifyJWT, async(req, res) =>{
            const id  = req.params.id;
            const filter = {_id: ObjectId(id)};
            const options = { upsert: true };
            const updatedDoc = {
              $set: {
                pending: true,
              }
            }
            const updatedOrderStatus = await orderCollection.updateOne(filter, updatedDoc, options);
            res.send(updatedOrderStatus);
          })









        app.get('/admin/:email' , async(req,res) =>{
            const email = req.params.email;
            const user = await userCollection.findOne({email: email});
            const isAdmin = user.role === 'admin';
            res.send({admin: isAdmin});
        })



        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                const filter = { email: email };
                const updateDoc = {
                    $set: { role: 'admin' },
                }
                const result = await userCollection.updateOne(filter, updateDoc);
                res.send(result)
            } else {
                return res.status(403).send({ message: 'forbidden access' });
            }

        })



        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            }
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, { expiresIn: '1d' });
            res.send({ result, token })
        })


        app.put('/update/:email', async (req, res) => {
            const email = req.params.email;
            const update = req.body;
            const filter = { email: email };
            console.log(email, update, "filter", filter)
            const options = { upsert: true };
            const updateDoc = {
                $set: update,
            }
            const result = await profileCollection.updateOne(filter, updateDoc, options);           
            res.send(result)
        })


        app.post('/order', async (req, res) => {
            const order = req.body;
            console.log(order)
            const result = await orderCollection.insertOne(order);
            res.send(result);
        })


        app.post('/review', async (req, res) => {
            const review = req.body;
            //   console.log(review)
            const result = await reviewCollection.insertOne(review);
            res.send(result)
        })

        app.post('/profile', async (req, res) => {
            const profile = req.body;
            //   console.log(review)
            const result = await profileCollection.insertOne(profile);
            res.send(result)
        })


        app.delete('/order/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const orderDelete = await orderCollection.deleteOne(query);
            res.send(orderDelete)
        })


        app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
            const service = req.body;
            console.log(typeof service, "servie", service)
            const price = service.price;
            const amount = price*100;
            const paymentIntent = await stripe.paymentIntents.create({
              amount : amount,
              currency: 'usd',
              payment_method_types:['card']
            });
            res.send({clientSecret: paymentIntent.client_secret})
          });


    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})