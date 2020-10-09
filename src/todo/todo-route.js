
const TodoService = require('./todo-service')
const xss = require('xss')
const path = require('path')
const express = require('express')
const jsonParser = express.json()
const router = express.Router()
const serializeTodo = todo => ({
    id: todo.id,
    title: xss(todo.title),
    completed: todo.completed
})

router
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        TodoService.getTodos(knexInstance)
            .then(todo => {
                res.json(todo.map(serializeTodo))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const { title, completed = false } = req.body
        const newTodo = { title }
        for (const [key, value] of Object.entries(newTodo))
            if (!value) return res.status(400).json({
                error: { message: `Misssing ${key} in boby` }
            })

        newTodo.completed = completed;

        TodoService.insertTodo(
            req.app.get('db'),
            newTodo)
            .then(todo => {
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${todo.id}`))
                    .json(serializeTodo(todo))
            })
            .catch(next)
    }
    )

router
    .route('/:todo_id')
    .all((req, res, next) => {
        if (isNaN(parseInt(req.params.todo_id))) {
            return res.status(404).json({
                error: { message: `Invalid id` }
            })
        }
        TodoService.getTodoById(
            req.app.get('db'),
            req.params.todo_id
        )
            .then(todo => {
                if (!todo) {
                    return res.status(404).json({
                        error: { message: `Todo doesn't exist` }
                    })
                }
                res.todo = todo
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(serializeTodo(res.todo))
    })
    .delete((req, res, next) => {
        TodoService.deleteTodo(
            req.app.get('db'),
            req.params.todo_id
        )
            .then(numRowsAffected => {
                res.status(204).end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const { title, completed } = req.body
        const todoToUpdate = { title, completed }

        const numberOfValues = Object.values(todoToUpdate).filter(Boolean).length
        if (numberOfValues === 0)
            return res.status(400).json({
                error: {
                    message: `Request body must content either 'title' or 'completed'`
                }
            })

        TodoService.updateTodo(
            req.app.get('db'),
            req.params.todo_id,
            todoToUpdate
        )
            .then(updatedTodo => {
                res.status(200).json(serializeTodo(updatedTodo[0]))
            })
            .catch(next)
    })
module.exports = router;