import express from 'express';
import cors from 'cors'
import  {MongoClient, ObjectId} from 'mongodb'
import 'dotenv/config'
const app = express();
const port = 8000;
app.use(cors());
app.use(express.json())
const client = new MongoClient(process.env.MONGO_DB_URL)
async function MONGODB() {
  try {
  
    await client.connect();
   
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch(err) {
    console.log(err);
  }
}
const db=await MONGODB()
const bookDatabase=client.db("assignment-fullstack");
const bookCollection=bookDatabase.collection("allbooks")
app.get('/', (req, res) => {
  res.send('Hello World!');
});
app.get('/all-books', async(req, res) => {
    const books= await bookCollection.find().toArray()
  res.send(books);
});

app.post('/all-books',async(req, res)=>{
  let data=req.body
  const result = await bookCollection.insertOne(data);
  res.send(result)

})
app.get('/all-books/:id', async(req, res) => {
    const id=req.params.id
    const query={_id:new ObjectId(id)}
  const result = await bookCollection.findOne(query);
  res.send(result)
});
app.get('/my-books/:email' ,async(req, res) => {
    let email=req.params.email
    const query={user_email: email}
  const result = await bookCollection.find(query).toArray();
  res.send(result)
});
app.get('/my-books/:email/:id', async(req, res) => {
    const id=req.params.id
    const query={_id:new ObjectId(id)}
  const result = await bookCollection.findOne(query);
  res.send(result)
});
app.patch('/my-books/:email/:id', async(req, res) => {
    const id=req.params.id
    const updateData=req.body
    const query={_id:new ObjectId(id)}
    const updateDoc = {
      $set: {
        title: updateData.title,
        author: updateData.author,
        category: updateData.category,
        published_year: Number(updateData.published_year),
        rating: Number(updateData.rating),
        price: Number(updateData.price),
        cover_image: updateData.cover_image,
        description: updateData.description,
      },
    };
  const result = await bookCollection.updateOne(query,updateDoc);
  res.send(result)
});
app.delete('/my-books/:email/:id', async(req, res) => {
    const id=req.params.id
    const query={_id:new ObjectId(id)}
  const result = await bookCollection.deleteOne(query);
  res.send(result)
});
app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});