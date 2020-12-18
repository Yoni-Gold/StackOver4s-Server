const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
    userID: String,
    date: Date,
    title: String,
    content: String,
    tags: Array,
});
 
postSchema.set('toJSON', {
    transform: (document, returnedObject) => {
      returnedObject.id = returnedObject._id.toString();
      delete returnedObject._id;
      delete returnedObject.__v;
    }
});
 
const Post = mongoose.model('Post', postSchema);

module.exports = Post;