const mongoose = require('mongoose');

const likeSchema = new mongoose.Schema({
    userID: String,
    type: String,
    postID: String,
    reciverID: String,
});

likeSchema.set('toJSON', {
    transform: (document, returnedObject) => {
      returnedObject.id = returnedObject._id.toString();
      delete returnedObject._id;
      delete returnedObject.__v;
    }
});

const Like = mongoose.model('Like', likeSchema);

module.exports = Like;