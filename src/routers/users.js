const express = require('express')
const User = require('../models/user')
const auth = require('../middleware/auth')
const multer = require('multer')
const Sharp = require('sharp')
const {sendWelcomeEmail} = require('../emails/account')


const avatar = multer({
    limits: {
        fileSize: 2000000,
    },
    fileFilter(req, file, cb) {
        if(file.originalname.match(/\.(jpg|png|jpeg)$/)){
            return cb(undefined, true)
        }
        cb(new Error('File must be an image (png, jpg, jpeg)'))
    }
})

const router = new express.Router()

router.post('/users/me/avatar', auth,  avatar.single('avatar'), async (req, res) =>{
    const buffer = await Sharp(req.file.buffer).resize({width: 250, height: 250}).png().toBuffer()
    req.user.avatar = buffer
    await req.user.save()
    res.send()
}, (error, req, res, next) => {
    res.status(400).send({error: error.message})
})

router.delete('/users/me/avatar', auth, async (req, res)=>{
    try{
        req.user.avatar = undefined
        await req.user.save()
        res.send()
    }catch(e){
        res.status(500).send(e)
    }
})

router.get('/users/:id/avatar', async (req, res) =>{
    try{
        const user = await User.findById(req.params.id)
        if(!user || !user.avatar){
            throw new Error()
        }
        res.set('Content-Type','image/png')
        res.send(user.avatar)
    }catch(e){
        res.status(404).send()
    }
})

router.post('/users', async (req,res) => {
    const user = new User(req.body)
    try{
        token = await user.generateAuthToken()
        sendWelcomeEmail(user.email, user.name)
        res.status(201).send({user, token})
    }catch(e){
        res.status(400).send(e)
    }
})

router.post('/users/logout',auth, async (req, res) =>{
    try{
        req.user.tokens = req.user.tokens.filter((token) => {
            return token.token !== req.token
        })
        await req.user.save()
        res.send()
    }catch(e){
        res.status(500).send()
    }
})

router.post('/users/logoutall',auth, async (req, res) =>{
    try{
        req.user.tokens = []
        await req.user.save()
        res.send()
    }catch(e){
        res.status(500).send()
    }
})

router.post('/users/login', async (req,res) => {
    try{
        const user = await User.findByCredentials(req.body.email, req.body.password)
        const token = await user.generateAuthToken()
        res.send({user, token})
    }catch(e){
        res.status(400).send()
    }
})


router.get('/users/me', auth, async (req, res) =>{
    res.send(req.user)
})

router.patch('/users/me', auth,  async (req, res)=>{
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'email', 'password', 'age']
    const isValidOperation = updates.every((update)=> allowedUpdates.includes(update))
    if(!isValidOperation){
        return res.status(400).send({error: 'Invalid Updates!'})
    }
    try{
        const user = req.user
        updates.forEach((update) => user[update] = req.body[update])
        await user.save()
//const user = await User.findByIdAndUpdate(_id, req.body, {new: true, runValidators: true})
        if(!user){
            return res.status(404).send()
        }
        res.send(user);
    }catch(e){
        res.status(400).send(e)
    }
})

router.delete('/users/me', auth, async (req, res)=>{
    try{
        // const user = await User.findByIdAndDelete(req.user._id)
        // if(!user){
        //     return res.status(404).send()
        // }
        await req.user.remove()
        res.send(req.user)
    }catch(e){
        res.status(500).send(e)
    }
})


module.exports = router