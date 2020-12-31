const request = require("supertest");
require('dotenv').config({path: './.env'});
const app = require("./app");
const mongoose = require('mongoose');

const Post = require('./Schemas/Post');
const Comment = require('./Schemas/Comment');
const User = require('./Schemas/User');
const Like = require('./Schemas/Like');

describe("Server API Tests: " , () => { // the tests are still under development and do not work yet
    beforeAll(async () => {
        await mongoose.connect(`mongodb+srv://yoni:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.uv5un.mongodb.net/${process.env.MONGO_TEST_DBNAME}?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true })
    });

    afterAll(async () => {
        await mongoose.connection.close();
    });

    it("test POST users: " , async () => {
        await request(app).post('/users').send({
            test: true,
            githubID: 'abc',
            name: 'ABC',
            email: '-'
        }).expect(200)

        await request(app).post('/users').send({
            test: true,
            githubID: 'xxx',
            name: 'XXX',
            email: '-'
        }).expect(200)

        let users = await User.find({});

        expect(users.length).toBe(2);
        expect(users[0].githubID).toBe('abc');
        expect(users[1].githubID).toBe('xxx');
        expect(users[0].name).toBe('ABC');
        expect(users[1].name).toBe('XXX');
    } , 30000);

    // it("test POST & GET for posts: " , async () => {
    //     await request(app).post('/posts').send({
    //         test: true,
    //         title: 'test title',
    //         content: 'test content',
    //         date: Date.now(),
    //         userID: 'xxx',
    //         tags: []
    //     }).expect(200);

    //     await request(app).post('/posts').send({
    //         test: true,
    //         title: 'test title 2',
    //         content: 'test content 2',
    //         date: Date.now(),
    //         userID: 'xxx',
    //         tags: []
    //     }).expect(200);

    //     await request(app).post('/posts').send({
    //         test: true,
    //         title: 'test title 3',
    //         content: 'test content 3',
    //         date: Date.now(),
    //         userID: 'abc',
    //         tags: []
    //     }).expect(200);

    //     let posts = await Post.find({});

    //     expect(posts.length).toBe(3);
    //     expect(posts[0].title).toBe('test title');
    //     expect(posts[1].title).toBe('test title 2');
    //     expect(posts[2].title).toBe('test title 3');
    // } , 30000);

    // it("test POST & GET for comments: " , () => {

    // });

    // it("test POST for likes: " , () => {

    // });

    // it("test PUT for users: " , () => {

    // });

    // it("test GET for users: " , () => {

    // });

    // it("test GET saved posts: " , () => {

    // });
})