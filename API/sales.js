const express = require('express')
const { ReturnDocument } = require('mongodb')
const salesApp = express.Router()

let salesCollection

salesApp.use((req, res, next) => {
  salesCollection = req.app.get('salesCollection')
  next()
})

salesApp.post('/addToSale', async (req, res) => {
  const book = req.body
  book.bookCount = parseInt(book.bookCount)
  const upd = await salesCollection.findOneAndUpdate(
    {name : book.name, author : book.author},
    {$inc : {bookCount : book.bookCount}},
    {ReturnDocument : 'after'}
  )
  if(upd === null){
    await salesCollection.insertOne(book)
  }
  res.send({message : 'book added for sale'})
})

salesApp.put('/buy', async (req, res) => {
  const book = req.body.book
  const order = await salesCollection.findOneAndUpdate(
    {name : book.name, author : book.author},
    {$inc : {bookCount : -1}},
    {ReturnDocument : 'after'}
  )
  res.send({message : `Your booking id : ${order._id}`})
})

salesApp.put('/getFromSale', async (req, res) => {
  const name = req.body.name
  const books = await salesCollection.find({name : {$regex : '.*' + name+'.*', $options : 'i'}}).toArray()
  res.send(books)
})

module.exports = salesApp