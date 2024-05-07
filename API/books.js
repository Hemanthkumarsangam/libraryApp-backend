const express = require('express');
const bookApp = express.Router()

let booksCollection;

bookApp.use((req, res, next) => {
  booksCollection = req.app.get('booksCollection')
  next()
})

bookApp.post('/lend', async (req, res) => {
  const book = req.body
  const result = await booksCollection.findOneAndUpdate(
    {name : book.name, author : book.author},
    {$inc : {bookCount : parseInt(book.bookCount)}},
    {ReturnDocument : 'after'}
  )
  if(result === null) {
    await booksCollection.insertOne(book);
  }
  res.send({message : 'book added successfully'})
})

bookApp.post('/borrow', async (req, res) => {
  const book = req.body
  const result = await booksCollection.findOneAndUpdate(
    {name : book.name, author : book.author, bookCount : {$gt : 0}},
    {$inc : {bookCount : -1}},
    {ReturnDocument : 'after'}
  )
  if(result === null) { 
    res.send({message : 'Book not found'})
    return
  }
  res.send(result._id)
})

bookApp.put('/return', async (req, res) => {
  const book = req.body
  await booksCollection.findOneAndUpdate(
    {name : book.name, author : book.author},
    {$inc : {bookCount : 1}},
    {ReturnDocument : 'after'}
  )
  res.send({message :'book returned successfully'})
})

bookApp.put('/nameSearch', async (req, res) => {
  const book = req.body
  const results = await booksCollection.find({name : {$regex : '.*' + book.name+'.*', $options : 'i'}}).toArray()
  res.send(results)
})

module.exports = bookApp