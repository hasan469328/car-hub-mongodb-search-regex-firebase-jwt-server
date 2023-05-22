const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// mongoDB

// const uri = "mongodb+srv://hasanur68bd:<password>@cluster.1pa94km.mongodb.net/?retryWrites=true&w=majority";

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster.1pa94km.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// verify token
const verifyJWT = (req, res, next) => {
  
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: "unauthorized access"})
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error , decoded) => {
    if(error){
      return res.status(401).send({error: true, message: "unauthorized access"})
    }
    req.decoded = decoded;
    next()
  })
}

async function run() {
  try {
    await client.connect();
    // services collection
    const servicesCollection = client.db("carDoctor").collection("services");
    const bookingsCollection = client.db("bookingsDB").collection("bookings");

    // JWT ROUTES
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.send({token})
    });

    // load all data from mongodb
    app.get("/services", async (req, res) => {
      const sort = req.query.sort;
      const search = req.query.search;
      
      // const query = {price: {$gte: 30, $lte:150}}
      const query = {title: {$regex: search, $options: 'i'}}
      const options = {
        sort: { price: sort === 'asc' ? 1 : -1 },
       
      };
      // db.InspirationalWomen.find({first_name: "Harriet"}).explain("executionStats")

      const cursor =  servicesCollection.find(query, options);
      const result = await cursor.toArray()
      res.send(result);
    });

    // load a single data from mongodb with needed field
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { title: 1, service_id: 1, price: 1, img: 1 },
      };
      const result = await servicesCollection.findOne(query, options);
      res.send(result);
    });

    // post booking information to database
    app.post("/bookings", async (req, res) => {
      const booking = req.body;
      const result = await bookingsCollection.insertOne(booking);
      res.send(result);
    });

    // get booking information from db by query params (email)
    app.get("/bookings", verifyJWT, async (req, res) => {
      const decoded = req.decoded;
      console.log(decoded)
      if(decoded.email !== req.query.email){
        res.status(403).send({error: 1, message: "forbidden"})
      }
      let query = {};
      if (req.query?.email) {
        query = { customerEmail: req.query.email };
      }
      const result = await bookingsCollection.find(query).toArray();
      res.send(result);
    });

    // delete booking data
    app.delete("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingsCollection.deleteOne(query);
      res.send(result);
    });

    // patch booking data
    app.patch("/bookings/:id", async (req, res) => {
      const id = req.params.id;
      const updatedData = req.body;
      console.log(updatedData);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          status: updatedData.status,
        },
      };
      console.log(updateDoc);
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.log);

// basic route
app.get("/", (req, res) => {
  res.send("server is running");
});

app.listen(port, () => {
  console.log(`app is running on port: ${port}`);
});
