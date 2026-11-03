import express from 'express';
import cors from 'cors';
import { MongoClient, ObjectId } from 'mongodb';
import 'dotenv/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGO_DB_URL);

async function MONGODB() {
  try {
    await client.connect();
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (err) {
    console.log(err);
  }
}
await MONGODB();
const verifyToken=async(req,res,next)=>{
  const authHeader=req.headers.authorization
  if(!authHeader){
    return res.status(401).send({msg:'Unauthorized'})
  }
  const token=authHeader.split(" ")[1]
  if(!token){
    return res.status(401).send({msg:'Unauthorized'})
  }

  const JWKS=createRemoteJWKSet(new URL(`${process.env.CLIENT_URL}/api/auth/jwks`))

  try {
    const {payload}=await jwtVerify(token,JWKS)
next()
  } catch (error) {
    return res.status(500).send({msg:'Token Not Verified'})
  }
}

const bookDatabase = client.db("assignment-fullstack");
const bookCollection = bookDatabase.collection("allbooks");
const borrowCollection = bookDatabase.collection('borrowBooks');

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.get('/all-books', async (req, res) => {
  const books = await bookCollection.find().toArray();
  res.send(books);
});

app.post('/all-books',verifyToken, async (req, res) => {
  let data = req.body;
  if (data.total_copies !== undefined) {
    data.total_copies = Number(data.total_copies);
  }
  const result = await bookCollection.insertOne(data);
  res.send(result);
});


app.get('/all-books/:id',verifyToken, async (req, res) => {
  
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await bookCollection.findOne(query);
  res.send(result);
});

app.get('/my-books/:email',verifyToken, async (req, res) => {
  let email = req.params.email;
  const query = { user_email: email };
  const result = await bookCollection.find(query).toArray();
  res.send(result);
});

app.get('/my-books/:email/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await bookCollection.findOne(query);
  res.send(result);
});

app.post('/my-borrows', async (req, res) => {
  try {
    const borrowData = req.body;
    const bookId = borrowData.book_id;

    if (!bookId) {
      return res.status(400).send({ error: "Missing book_id in request body." });
    }

    const updateResult = await bookCollection.updateOne(
      { 
        _id: new ObjectId(bookId), 
        total_copies: { $gt: 0 } 
      },
      { 
        $inc: { total_copies: -1 } 
      }
    );

    if (updateResult.matchedCount === 0) {
      return res.status(400).send({ error: "Book is out of stock or does not exist." });
    }

    // 2. Insert into borrows collection
    const result = await borrowCollection.insertOne(borrowData);
    res.send(result);
  } catch (error) {
    console.error("Borrow error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.get('/my-borrows', async (req, res) => {
  const result = await borrowCollection.find().toArray();
  res.send(result);
});

app.get('/my-borrows/:email',verifyToken, async (req, res) => {
  let email = req.params.email;
  const query = { user_email: email };
  const result = await borrowCollection.find(query).toArray();
  res.send(result);
});

app.get('/my-borrows/:email/:bookId', async (req, res) => {
  try {
    const email = req.params.email?.trim();
    const bookId = req.params.bookId?.trim();

    const data = await borrowCollection.findOne({
      user_email: { $regex: `^${email}$`, $options: "i" },
      $or: [
        { book_id: bookId },
        { _id: ObjectId.isValid(bookId) ? new ObjectId(bookId) : bookId }
      ]
    });

    res.send({
      isBorrowed: Boolean(data),
      data: data || null,
    });
  } catch (error) {
    res.status(500).send({ isBorrowed: false, error: error.message });
  }
});

app.patch('/my-books/:email/:id', verifyToken, async (req, res) => {
  const id = req.params.id;
  const updateData = req.body;
  const query = { _id: new ObjectId(id) };

  const totalCopies = updateData.total_copies ?? updateData.copies;

  const updateDoc = {
    $set: {
      title: updateData.title,
      author: updateData.author,
      category: updateData.category,
      total_copies: Number(totalCopies) || 0,
      published_year: Number(updateData.published_year),
      rating: Number(updateData.rating),
      price: Number(updateData.price),
      cover_image: updateData.cover_image,
      description: updateData.description,
      in_stock: Number(totalCopies) > 0,
    },
  };

  const result = await bookCollection.updateOne(query, updateDoc);
  res.send(result);
});

app.delete('/my-books/:email/:id',verifyToken, async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) };
  const result = await bookCollection.deleteOne(query);
  res.send(result);
});

app.delete('/my-borrows/:email/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };

   
    const borrowedRecord = await borrowCollection.findOne(query);

    if (!borrowedRecord) {
      return res.status(404).send({ error: "Borrow record not found." });
    }

    if (borrowedRecord.book_id) {
      await bookCollection.updateOne(
        { _id: new ObjectId(borrowedRecord.book_id) },
        { $inc: { total_copies: 1 } }
      );
    }

    const result = await borrowCollection.deleteOne(query);
    res.send(result);
  } catch (error) {
    console.error("Return error:", error);
    res.status(500).send({ error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});