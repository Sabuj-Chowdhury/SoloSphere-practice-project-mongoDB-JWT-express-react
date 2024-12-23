const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const port = process.env.PORT || 9000;
const app = express();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i53p4.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    const db = client.db("solo-db"); // database
    const jobsCollection = db.collection("jobs"); //jobs collection
    const bidsCollection = db.collection("bids"); //bids collection

    // ************************POST***********************
    // API for saving job post data in DB
    app.post("/add-job", async (req, res) => {
      const jobData = req.body;
      // console.log(jobData);

      const result = await jobsCollection.insertOne(jobData);
      res.send(result);
    });

    // API for saving bid data in DB
    app.post("/add-bid", async (req, res) => {
      const bidData = req.body;
      // 0. check if a user already placed a bid in this job

      const query = { email: bidData.email, jobId: bidData.jobId };
      const alreadyExist = await bidsCollection.findOne(query);
      // console.log(alreadyExist);

      if (alreadyExist) {
        return res.status(400).send("you have already placed a job");
      }

      // 1. save bid data in bids collection

      const result = await bidsCollection.insertOne(bidData);

      // 2. increase bid count in jobs collection
      const filter = { _id: new ObjectId(bidData.jobId) };
      const update = {
        $inc: { bid_count: 1 },
      };
      const updateBid = await jobsCollection.updateOne(filter, update);

      res.send(result);
    });

    // ************************GET***********************
    // API to get all the jobs
    app.get("/all-jobs", async (req, res) => {
      const filter = req.query.filter;
      const search = req.query.search;
      const sort = req.query.sort;
      let options = {};
      if (sort) {
        options = {
          sort: {
            deadline: sort === "asc" ? 1 : -1,
          },
        };
      }
      let query = {
        title: {
          $regex: search,
          $options: "i",
        },
      };
      if (filter) {
        query.category = filter;
      }
      const result = await jobsCollection.find(query, options).toArray();
      res.send(result);
    });

    // API to get all jobs post by logged in user
    app.get("/all-jobs/:email", async (req, res) => {
      const email = req.params.email;
      const query = { "buyer.email": email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // API to get a single job by id
    app.get("/job/:id", async (req, res) => {
      const id = req.params.id;
      // console.log(id);
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // get all bids by specific logged in user that placed those bids
    app.get("/my-bids/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email };
      const result = await bidsCollection.find(query).toArray();
      res.send(result);
    });

    // get all bid request for specific logged in user
    app.get("/bid-request/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { buyer: email };
      const result = await bidsCollection.find(filter).toArray();
      res.send(result);
    });

    // **********************PUT**************************

    // API to update job
    app.put("/update-job/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const updated = {
        $set: jobData,
      };
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const result = await jobsCollection.updateOne(query, updated, options);
      res.send(result);
    });

    // **********************PATCH************************

    // update bid status
    app.patch("/bid-status-update/:id", async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const { status } = req.body;
      const update = {
        $set: { status },
      };
      const result = await bidsCollection.updateOne(filter, update);
      res.send(result);
    });

    // **********************DELETE************************

    //delete a job from the DB
    app.delete("/delete-job/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("Hello from SoloSphere Server....");
});

app.listen(port, () => console.log(`Server running on port ${port}`));
