const express = require('express');
const userApp = express.Router();
const bcryptjs = require('bcryptjs');
const { ReturnDocument } = require('mongodb');

let userCollection;

userApp.use((req, res, next) => {
  userCollection = req.app.get('userCollection');
  next();
})

userApp.post('/register', async (req, res) => {
  const newUser = req.body;
  const email = await userCollection.findOne({email : newUser.email});
  if(email !== null){
    return res.send({message : 'Account already exists'})
  }
  newUser.password = await bcryptjs.hash(newUser.password, 7);
  await userCollection.insertOne({...newUser, points : 0, lended : [], borrowed : []});
  res.send({message : 'Account created successfully'})
})

userApp.post('/login', async (req, res) => {
  const user = req.body;
  const validUser = await userCollection.findOne({email : user.email});
  if(validUser === null) { return res.send({message : 'user not found'});}
  const passCheck = await bcryptjs.compare(user.password, validUser.password);
  if(passCheck === false) { return res.send({message : 'Invalid password'});}
  res.send({message : 'exist', user : validUser})
})

userApp.put('/lend', async (req, res) => {
  const book = req.body
  const {email, ...bookData} = book
  if(email === undefined){
    res.send({message : 'Login to perform the action'})
    return
  }
  const user = await userCollection.findOne({email: email})
  const lended = user.lended.find((rec) => rec.name === book.name) 
  if(lended === undefined){
  await userCollection.findOneAndUpdate(
    {email : email},
    {$inc: {points : 4}, $addToSet : {lended : bookData}},
    {ReturnDocument : 'after'}
  )}else{
    const upd = await userCollection.findOneAndUpdate(
      {email : email , 'lended.name' : book.name, 'lended.author' : book.author},
      {$inc: {points : 4, 'lended.$.bookCount' : book.bookCount}},
      {ReturnDocument : 'after'}
    )
  }
  res.send({message : "Thank you for donating a book"})
})

userApp.put('/borrow', async (req, res) => {
  const bookData = req.body
  const {email, ...book} = bookData
  if(email === null){
    res.send({message : 'Login to perform the action'})
    return
  }
  const user = await userCollection.findOne({
    email : email,
    'borrowed': {
      $elemMatch: {
        name: book.name,
        author: book.author,
        returned: false
      }
    }
  })
  if(user === null){
    const date = new Date();
    await userCollection.findOneAndUpdate(
      {email : email},
      {$inc : {points : 1}, $addToSet : {borrowed : {...book, date : date, returned : false}}},
      {ReturnDocument : 'after'}
    )
    res.send({message : 'book borrowed successfully'})
    return
  }  
  res.send({message : "book already borrowed"})
})

userApp.put('/return', async (req, res) => {
  const book = req.body
  book.date = new Date(book.date)
  if(book.email === null){
    res.send({message : 'Login to perform the action'})
    return
  }
  const result = await userCollection.findOne({email : book.email})
  const userResult = result.borrowed.find((user) => user.date.getTime() === book.date.getTime())
  const date = new Date()
  const diff = (userResult.date.getFullYear() - date.getFullYear())*365 + (userResult.date.getMonth() - date.getMonth())*30 + (userResult.date.getDate() - date.getDate()) * 7
  const point = (diff > 45) ? -1*(diff - 45) : 1

  const upd = await userCollection.findOneAndUpdate(
    {email : book.email, 'borrowed.date':book.date},
    {$set: {'borrowed.$.returned' : true}, $inc : {points :  point}},
    {ReturnDocument : 'after'}
  )
  res.send({message : point})
})

userApp.get('/profile/:id', async (req, res) => {
  const user = await userCollection.findOne({email: req.params.id})
  res.send(user)
})

userApp.put('/updateName', async (req, res) => {
  const user = req.body
  await userCollection.findOneAndUpdate(
    {email : user.email},
    {$set : {name : user.newName}},
    {ReturnDocument : 'after'}
  )
  res.send({message : 'Details updated successfully'})
})

userApp.put('/buy', async (req, res) => {
  const request = req.body
  await userCollection.findOneAndUpdate(
    {email : request.email},
    {$inc : {points : -1*request.book.price}},
    {ReturnDocument : 'after'}
  )
  res.send('Book Booked Successfully')
})

module.exports = userApp;