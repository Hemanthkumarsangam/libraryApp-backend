const express = require('express');
const userApp = express.Router();
const bcryptjs = require('bcryptjs');
const { ReturnDocument } = require('mongodb');
const {sendMail, sendRequestMail} = require('../email');

let userCollection;
let reqCollection;
let otp

function getRand(){
  return (Math.floor(100000 + Math.random() * 900000)).toString()
}

userApp.use((req, res, next) => {
  userCollection = req.app.get('userCollection');
  reqCollection = req.app.get('reqCollection');
  next();
})

userApp.post('/register', async (req, res) => {
  const newUser = req.body;
  const email = await userCollection.findOne({email : newUser.email});
  if(email !== null){
    return res.send({message : 'Account already exists'})
  }
  otp = getRand()
  sendMail(
    'One Time Password', 
    `Your one time password is ${otp}`,
    newUser.email
  )
  res.send({message: 'otp sent to email'})
})

userApp.post('/otpVerify', async (req, res) => {
  const {rotp, ...newUser} = req.body
  if(rotp !== otp){res.send({message : 'Invalid otp'}); return}
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
  const rid = getRand()
  await reqCollection.insertOne({...book, rid, reqType : 'Lend'})
  sendRequestMail('Request for lending a book', `User with mail address: ${email} is willing lo lend ${book.name} X ${book.bookCount}<br>Request id : ${rid}`)
  sendMail(`Response for lend request`, `You request for lending ${book.name} X ${book.bookCount} is placed successfully<br>You're request id : ${rid}`, email)
  res.send({message : "Thank you for donating a book\nReward will be granted shortly"})
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
    const rid = getRand()
    await reqCollection.insertOne({...bookData, rid, reqType : 'Borrow'})
    sendRequestMail('Request for borrowing a book', `User with mail address: ${email} is willing lo borrow ${book.name}<br>Request id : ${rid}`)
    sendMail(`Response for borrow request`, `You request for borrowing ${book.name} is placed successfully<br>You're request id : ${rid}`, email)
    res.send({message: `Borrow request placed successfully\nRequest id: ${rid}`})
    return
  }  
  res.send({message : "book already borrowed"})
})

userApp.put('/return', async (req, res) => {
  const book = req.body
  book.date = new Date(book.date)
  if(book.email === null){
    res.send({message : 'Login to perform the action'})
  }
  const returnDate = book.date
  const borrowDate = new Date(book.date)
  returnDate.setDate(returnDate.getDate()+45)
  const rid = getRand()
  await reqCollection.insertOne({name: book.name, author: book.author, email: book.email,date: returnDate, borrowedOn: borrowDate, rid, reqType: 'Return'})
  sendRequestMail('Request for returning a book', `User with mail address: ${book.email} is willing lo return ${book.name}<br>Request id : ${rid}`)
  sendMail(`Response for return request`, `You request for returning ${book.name} is placed successfully<br>You're request id : ${rid}`, book.email)
  res.send({message: `Return request placed successfully\nRequest id: ${rid}`})
  return
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

userApp.get('/getRequests', async (req, res) => {
  const content = await reqCollection.find().toArray()
  res.send({content: content})
})

userApp.delete('/declineReq/:id', async (req, res) => {
  const rid = req.params.id.toString()
  await reqCollection.deleteOne({rid: rid})
  res.send({message : 'done'})
})

userApp.put('/grantLend', async (req, res) => {
  const book = req.body.book
  const {email, _id, rid, reqType, ...bookData} = book
  const user = await userCollection.findOne({email: email})
  const lended = user.lended.find((rec) => rec.name === book.name) 
  if(lended === undefined){
  await userCollection.findOneAndUpdate(        
    {email : email},
    {$inc: {points : 4*book.bookCount}, $addToSet : {lended : bookData}},
    {ReturnDocument : 'after'}
  )}else{
    await userCollection.findOneAndUpdate(
      {email : email , 'lended.name' : book.name, 'lended.author' : book.author},
      {$inc: {points : 4*book.bookCount, 'lended.$.bookCount' : book.bookCount}},
      {ReturnDocument : 'after'}
    )
  }  
  await reqCollection.deleteOne({rid: rid})
  sendMail('Lend Request Accepted',  `Your request of lending ${book.name} X ${book.bookCount} with request id: ${book.rid} is accepted submit the books in the library within 3 days`, email)
  res.send({message: 'Granted'})
})

userApp.put('/grantBorrow', async (req, res) => {
  const bookData = req.body.book
  const {email, _id, rid, reqType, ...book} = bookData
  const date = new Date()
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
    await userCollection.findOneAndUpdate(
      {email : email},
      {$inc : {points : 1}, $addToSet : {borrowed : {...book, date : date, returned : false}}},
      {ReturnDocument : 'after'}
    )
    res.send({message : 'Borrow request granted successfully'})
    await reqCollection.deleteOne({rid: rid})
    sendMail('Borrow Request Accepted',  `Your request of borrowing ${book.name} with request id: ${book.rid} is accepted\nCollect the book from the library within 24hrs\nYou are requested to return the book to the library within 45 days`, email)
    return
  }
  await reqCollection.deleteOne({rid: rid})
  res.send({message : "Book already borrowed"})
})

userApp.put('/grantReturn', async (req, res) => {
  const book = req.body
  const returnedOn = new Date(book.date)
  const borrowedOn = new Date(book.borrowedOn)
  const diffTime = returnedOn - borrowedOn
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  const point = (diffDays > 45) ? -1*(Math.floor((diffDays - 45) / 2)) : 2
  await userCollection.findOneAndUpdate(
    {email : book.email, 'borrowed.date':borrowedOn},
    {$set: {'borrowed.$.returned' : true}, $inc : {points :  point}},
    {ReturnDocument : 'after'}
  )
  let msg = `Your request of Returning ${book.name} with request id: ${book.rid} is accepted\Return the book to the library within 24hrs\nYou are`
  msg += (point < 0) ? `penalized with ${point} points due late return of the book` : `Rewarded with 2 points for returning of the book`
  sendMail('Borrow Request Accepted', msg, book.email)
  await reqCollection.deleteOne({rid: book.rid})
  res.send({message : `${point}`})
})

module.exports = userApp;