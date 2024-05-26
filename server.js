require('dotenv').config()
const express = require('express')
const cors = require('cors')
const { MongoClient, Collection } = require('mongodb')
const bookApp = require('./API/books')
const userApp = require('./API/user')
const salesApp = require('./API/sales')
const app = express()
const port = process.env.PORT
const uri = 'mongodb://localhost:27017'

app.use(express.json())
app.use(cors())

MongoClient.connect(uri)
.then((client) => {
  const database = client.db('libraryApp')
  
  const userCollection = database.collection('userCollection')
  const salesCollection = database.collection('salesCollection')
  const booksCollection = database.collection('booksCollection')
  const reqCollection = database.collection('reqCollection')

  app.set('userCollection', userCollection)
  app.set('salesCollection', salesCollection)
  app.set('booksCollection', booksCollection)
  app.set('reqCollection', reqCollection)

  console.log('DB connection established')
})

app.use('/user', userApp)
app.use('/book', bookApp)
app.use('/sales', salesApp)

app.listen(port, () => {
  console.log(`Server listening on port number ${port}\nhttps://localhost:7777`)
})