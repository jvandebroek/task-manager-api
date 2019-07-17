const express = require('express')
const router = new express.Router()
const Task = require('../models/task')
const auth = require('../middleware/auth')


//GET tasks?completed=false
//GET tasks?limit=10&skip=10
//Get tasks?sortBy=createdAt:asc****(or desc)
router.get('/tasks', auth, async (req, res) =>{
    try{
        const match = {}
        const sort = {}
        if (req.query.sortBy){
            const parts = req.query.sortBy.split(':')
            sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
        }
        // const match = {owner: req.user._id}
        // const options = {}
        if (req.query.completed){
            match.completed = req.query.completed === 'true'
        }
        // if (req.query.limit){
        //     options.limit = parseInt(req.query.limit)
        // }
        // if (req.query.skip){
        //     options.skip = parseInt(req.query.skip)
        // }
        await req.user.populate({
            path: 'tasks',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            } 
        }).execPopulate()
        res.send(req.user.tasks)
        // const tasks = await Task.find(match, options)
        // res.send(tasks)
    }catch(e){
        res.status(500).send(e)
    }
})

router.get('/tasks/:id', auth, async (req, res) =>{
    const _id = req.params.id

    try{
        const task = await Task.findOne({_id, owner: req.user._id})
        if(task){
            res.send(task)
        }else{
            res.status(404).send()
        }
    }catch(e){
        res.status(500).send()
    }
})

router.post('/tasks', auth, async (req,res) => {
    const task = new Task({
        ...req.body,
        owner: req.user._id
    })
    try{
        await task.save()
        res.status(201).send(task)
    }catch(e){
        res.status(400).send(error)
    }
})

router.patch('/tasks/:id', auth, async (req, res)=>{
    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'completed']
    const isValidOperation = updates.every((update)=> allowedUpdates.includes(update))
    const _id = req.params.id
    if(!isValidOperation){
        return res.status(400).send({error: 'Invalid Updates!'})
    }
    try{
        const task = await Task.findOne({_id, owner: req.user._id})
        //const task = await Task.findByIdAndUpdate(_id, req.body, {new: true, runValidators: true})
        if(!task){
            return res.status(404).send()
        }
        updates.forEach((update) => task[update] = req.body[update])
        await task.save()
        res.send(task);
    }catch(e){
        res.status(400).send(e)
    }
})

router.delete('/tasks/:id',auth, async (req, res)=>{
    const _id = req.params.id
    try{
        const task = await Task.findOneAndDelete({_id, owner: req.user._id})
        if(!task){
            return res.status(404).send()
        }
        res.send(task)
    }catch(e){
        res.status(500).send(e)

    }
})


module.exports = router