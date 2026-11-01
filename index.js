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


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});