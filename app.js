const express = require('express'); // import express library
require('dotenv').config({path: './.env'});
const app = express();
app.use(express.json());
app.options('/*' , (req , res) => res.status(200).send());
const mongoose = require('mongoose');

const Post = require('./Schemas/Post');
const Comment = require('./Schemas/Comment');
const User = require('./Schemas/User');
const Like = require('./Schemas/Like');

const unknownEndpoint = (request, response) => {
    response.status(404).send({ error: 'unknown endpoint' });
};

const mongoConnect = (req , res , next) => {
    console.log('url: ' + req.url , ' method: ' + req.method , ' params: ' + req.params , ' query: ' + req.query);
    mongoose.connect(`mongodb+srv://yoni:${process.env.MONGO_PASSWORD}@${process.env.MONGO_CLUSTER}.uv5un.mongodb.net/${process.env.MONGO_DBNAME}?retryWrites=true&w=majority`, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(() => {
            next();
        })
        .catch(error => {
            console.log('error connecting to MongoDB: ', error.message)
        });  
}

app.post('/posts' , mongoConnect , (req , res) => {
    const post = new Post({
        userID: req.body.userID,
        date: req.body.date,
        content: req.body.content,
        title: req.body.title,
        tags: req.body.tags
    });
    
    post.save().then(result => {
        console.log('saved!');
        mongoose.connection.close()
        .then(() => res.send('Saved'));
    });
})

app.post('/comments' , mongoConnect , (req , res) => {
    const comment = new Comment({
        userID: req.body.userID,
        date: req.body.date,
        content: req.body.content,
        postID: req.body.postID
    });
    
    comment.save().then(result => {
        console.log('saved!');
        mongoose.connection.close()
        .then(() => res.send('Saved'));
    });
})

app.post('/likes' , mongoConnect , (req , res) => {
    Like.find({
        userID: req.body.userID, 
        type: req.body.type, 
        postID: req.body.postID,
        reciverID: req.body.reciverID
    })
    .then(result => {
        if (!result[0])
        {
            const like = new Like({
                userID: req.body.userID,
                type: req.body.type,
                postID: req.body.postID,
                reciverID: req.body.reciverID
            });
            
            like.save().then(result => {
                console.log('saved!');
                mongoose.connection.close()
                .then(() => res.send('Saved'));
            });
        }

        else
        {
            Like.findOneAndDelete({userID: req.body.userID , type: req.body.type , postID: req.body.postID , reciverID: req.body.reciverID} , (error) => {
                if (error)
                {
                    console.log(error);
                }

                else
                {
                    mongoose.connection.close()
                    .then(() => res.send('like removed'));
                }
            });
        }
    })
})

app.post('/users' , mongoConnect , async (req , res) => {
    let usersCount;
    let postsCount;
    let tagsArray = [{tag: "" , count: 0}];
    await Post.find({} , (error , result) => {
        let countObject = {};
        postsCount = result.length;
        result.forEach(post => {
            post.tags.forEach(tag => {
                countObject[tag] ? countObject[tag]++ : countObject[tag] = 1;
            })
        });
        console.log(countObject , "    Node: " + countObject['node']);
        let bool = false;
        for (tag in countObject)
        {
            for (let i = 0; i < tagsArray.length; i++)
            {
                if (tagsArray[i].count < countObject[tag])
                {
                    tagsArray.splice(i, 0, {tag , count: countObject[tag]});
                    bool = true;
                    break;
                }
            }

            if (!bool)
            {
                tagsArray.push({tag , count: countObject[tag]});
            }
            bool = false;

            if (tagsArray.length > 3)
            {
                tagsArray.pop();
            }
        }
        console.log(tagsArray);
    })
    .then(() => User.countDocuments({} , (error , count) => usersCount = count))

    if (!(req.body.githubID && req.body.name && req.body.email))
    {
        mongoose.connection.close()
        .then(() => res.send({ usersCount , postsCount , tagsArray }));
    }

    else
    {
        User.find({githubID: req.body.githubID}).then(async user => {
            user = user[0];
            if (user)
            {
                if (user.name !== req.body.name)
                {
                    console.log('different Name');
                    await User.findOneAndUpdate({githubID: req.body.githubID} , {name: req.body.name});
                }
                
                let rank = await Like.countDocuments({reciverID: user.githubID}) + await Post.countDocuments({userID: user.githubID}) * 10;
                User.findOneAndUpdate({githubID: req.body.githubID} , {rank: rank} , (error) => {
                    if (error)
                    {
                        console.log(error);
                        mongoose.connection.close()
                        .then(() => res.send(error));
                    }
                    
                    else
                    {
                        console.log('calculated rank: ' , rank);
                        mongoose.connection.close()
                        .then(() => res.send({ usersCount , postsCount , tagsArray }));
                    }
                });
            }
            
            else 
            {
                const newUser = new User({
                    githubID: req.body.githubID,
                    name: req.body.name,
                    email: req.body.email,
                    rank: 0,
                    savedPosts: []
                });
                
                newUser.save().then(result => {
                    console.log('saved!');
                    mongoose.connection.close()
                    .then(() => res.send({ usersCount , postsCount , tagsArray }));
                });
            }
        })   
    }
})

app.get('/posts' , mongoConnect , (req , res) => {
    let { search , offset , userFilter , sort , tags , uid } = req.query;
    tags = tags ? tags.split('$') : [];
    offset = parseInt(offset);
    if (RegExp('^(\\s)*$').test(search) || !search) 
    {
        search = null;
    }
    else 
    {
        search = search.trim();
    }

    if (req.body.saved)
    {
        Post.find({$or: req.body.saved}) // saved => [{id: 'fr65d012eecam34k42dc771'} , {id: '534rvg56y6ffgf66g5yr91'} , {id: 'csd024j3t67s3js75t437h'}]
        .sort('-date')
        .then(async result => {
            let dataLength = result.length;
            result = result.slice(0 , offset);
            result = await Promise.all(result.map(async post => {
                post = post.toJSON();
                await Like.countDocuments({type: 'post' , postID: post.id} , (error , count) => post = {...post , likes: count});
                uid && await Like.find({userID: uid , type: 'post' , postID: post.id}).then(result => result[0] ? post = {...post , didLike: true} : post = {...post , didLike: false});
                uid && await User.find({githubID: uid}).then(user => user[0].savedPosts.includes(post.id) ? post = {...post , didSave: true} : post = {...post , didSave: false});
                await User.find({githubID: post.userID}).then(result => result[0] ? post = {...post , userName: result[0].name} : post = {...post , userName: 'unknown'});
                return post;
            }))
            mongoose.connection.close()
            .then(() => res.send({data: result , length: dataLength}));
        })
        .catch(error => {
            mongoose.connection.close()
            .then(() => console.log(error));
        })
    }

    else
    {
        Post.find({$and:[userFilter ? {userID: userFilter} : {} , 
            search ? {$or: [{title: { $regex: '.*' + search + '.*' , $options: 'i'}} , {content: { $regex: '.*' + search + '.*' , $options: 'i'}}]} : {} , 
            tags[0] ? {tags : { $all : tags }} : {}]})
        .sort('-date')
        .then(async result => {
            let dataLength = result.length;
            if (sort === 'likes')
            {
                result = await Promise.all(result.map(async post => {
                    post = post.toJSON();
                    await Like.countDocuments({type: 'post' , postID: post.id} , (error , count) => post = {...post , likes: count});
                    return post;
                }));

                let sortedArray = [result[0]];
                let bool = false;
                for (let i = 1; i < result.length; i++)
                {
                    for (let j = 0; j < sortedArray.length; j++)
                    {
                        if (sortedArray[j].likes < result[i].likes)
                        {
                            sortedArray.splice(j, 0, result[i]);
                            bool = true;
                            break;
                        }
                    }
                    if (!bool)
                    {
                        sortedArray.push(result[i]);
                    }
                    bool = false;
                }

                result = sortedArray.slice(0 , offset);
                result = await Promise.all(result.map(async post => {
                    uid && await Like.find({userID: uid , type: 'post' , postID: post.id}).then(result => result[0] ? post = {...post , didLike: true} : post = {...post , didLike: false});
                    uid && await User.find({githubID: uid}).then(user => user[0].savedPosts.includes(post.id) ? post = {...post , didSave: true} : post = {...post , didSave: false});
                    await User.find({githubID: post.userID}).then(result => result[0] ? post = {...post , userName: result[0].name} : post = {...post , userName: 'unknown'});
                    return post;
                }))

                mongoose.connection.close()
                .then(() => res.send({data: result , length: dataLength}));
            }

            else
            {
                result = result.slice(0 , offset);
                result = await Promise.all(result.map(async post => {
                    post = post.toJSON();
                    await Like.countDocuments({type: 'post' , postID: post.id} , (error , count) => post = {...post , likes: count});
                    uid && await Like.find({userID: uid , type: 'post' , postID: post.id}).then(result => result[0] ? post = {...post , didLike: true} : post = {...post , didLike: false});
                    uid && await User.find({githubID: uid}).then(user => user[0].savedPosts.includes(post.id) ? post = {...post , didSave: true} : post = {...post , didSave: false});
                    await User.find({githubID: post.userID}).then(result => result[0] ? post = {...post , userName: result[0].name} : post = {...post , userName: 'unknown'});
                    return post;
                }))
                mongoose.connection.close()
                .then(() => res.send({data: result , length: dataLength})); 
            }
        })
        .catch(error => {
            mongoose.connection.close()
            .then(() => console.log(error));
        })
    }
})

app.get('/comments/:id' , mongoConnect , (req , res) => {
    let { offset , uid } = req.query;
    offset = parseInt(offset);
    Comment.find({postID: req.params.id})
    .sort('-date')
    .then(async result => {
        let dataLength = result.length;
        result = result.slice(0 , offset);
        result = await Promise.all(result = result.map(async comment => {
            comment = comment.toJSON();
            await Like.countDocuments({type: 'comment' , postID: comment.id} , (error , count) => comment = {...comment , likes: count});
            uid && await Like.find({userID: uid , type: 'comment' , postID: comment.id}).then(result => result[0] ? comment = {...comment , didLike: true} : comment = {...comment , didLike: false});
            await User.find({githubID: comment.userID}).then(result => result[0] ? comment = {...comment , userName: result[0].name} : comment = {...comment , userName: 'unknown'});;
            return comment;
        }));
        mongoose.connection.close()
        .then(() => res.send({data: result , length: dataLength}));
    })
    .catch(error => {
        mongoose.connection.close()
        .then(() => console.log(error));
    })
})

app.get('/posts/:id' , mongoConnect , (req , res) => {
    let { uid } = req.query;
    console.log(uid);
    Post.findById(req.params.id).then(async post => {
        post = post.toJSON();
        await Like.countDocuments({type: 'post' , postID: post.id} , (error , count) => post = {...post , likes: count});
        uid && await Like.find({userID: uid , type: 'post' , postID: post.id}).then(result => result[0] ? post = {...post , didLike: true} : post = {...post , didLike: false});
        uid && await User.find({githubID: uid}).then(user => user[0].savedPosts.includes(post.id) ? post = {...post , didSave: true} : post = {...post , didSave: false});
        await User.find({githubID: post.userID}).then(result => result[0] ? post = {...post , userName: result[0].name} : post = {...post , userName: 'unknown'});
        mongoose.connection.close()
        .then(() => res.send(post)); 
    })
    .catch(error => {
        console.log(error);
        mongoose.connection.close()
        .then(() => res.send(error)); 
    });
})

app.get('/users/:id' , mongoConnect , (req , res) => {
    User.find({githubID: req.params.id}).then(async result => {
        result = result[0];
        let postsCount;
        let commentsCount;
        await Post.countDocuments({userID: req.params.id} , (error , count) => postsCount = count);
        await Comment.countDocuments({userID: req.params.id} , (error , count) => commentsCount = count);
        mongoose.connection.close()
        .then(() => res.send({postsCount , commentsCount , rank: result.rank}));
    })
    .catch(error => {
        console.log(error);
        mongoose.connection.close()
        .then(() => res.send(error));
    });
})

app.get('/saved/:id' , mongoConnect , (req , res) => {
    let { offset } = req.query;
    let id = req.params.id;
    User.find({githubID: id} , (error , user) => {
        if (error)
        {
            console.log(error);
        }
        user = user[0];
        let queryArray = [];
        for (post of user.savedPosts)
        {
            queryArray.push({_id: post});
        }
        Post.find({$or: queryArray}) // saved => [{id: 'fr65d012eecam34k42dc771'} , {id: '534rvg56y6ffgf66g5yr91'} , {id: 'csd024j3t67s3js75t437h'}]
        .sort('-date')
        .then(async result => {
            let dataLength = result.length;
            result = result.slice(0 , offset);
            result = await Promise.all(result.map(async post => {
                post = post.toJSON();
                await Like.countDocuments({type: 'post' , postID: post.id} , (error , count) => post = {...post , likes: count});
                await Like.find({userID: id , type: 'post' , postID: post.id}).then(result => result[0] ? post = {...post , didLike: true} : post = {...post , didLike: false});
                await User.find({githubID: id}).then(user => user[0].savedPosts.includes(post.id) ? post = {...post , didSave: true} : post = {...post , didSave: false});
                await User.find({githubID: post.userID}).then(result => result[0] ? post = {...post , userName: result[0].name} : post = {...post , userName: 'unknown'});
                return post;
            }))
            mongoose.connection.close()
            .then(() => res.send({data: result , length: dataLength}));
        })
    });
})

app.put('/users/:id' , mongoConnect , (req , res) => {
    User.find({githubID: req.params.id}).then(user => {
        user = user[0];
        console.log(user , user.savedPosts);
        console.log(req.body.post);
        if (user.savedPosts.includes(req.body.post))
        {
            let newPosts = user.savedPosts.filter(e => e !== req.body.post);
            User.findOneAndUpdate({githubID: req.params.id} , {savedPosts: newPosts} , (error) => {
                if (error)
                {
                    res.send(error);
                }

                else
                {
                    console.log('removed');
                    mongoose.connection.close()
                    .then(() => res.send('removed'));
                }
            });
        }

        else 
        {
            let newPosts = user.savedPosts;
            newPosts.push(req.body.post);
            User.findOneAndUpdate({githubID: req.params.id} , {savedPosts: newPosts} , (error) => {
                if (error)
                {
                    res.send(error);
                }

                else
                {
                    console.log('saved');
                    mongoose.connection.close()
                    .then(() => res.send('saved'));
                }
            });  
        }
    })
})

app.use(unknownEndpoint);

console.log("Listening to port: " + (process.env.PORT || 3001));
app.listen(process.env.PORT || 3001); // localhost port