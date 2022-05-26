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