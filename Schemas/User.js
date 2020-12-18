const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    githubID: String,
    name: String,
    email: String,
    rank: Number,
    savedPosts: Array,
});

userSchema.set('toJSON', {
    transform: (document, returnedObject) => {
      returnedObject.id = returnedObject._id.toString();
      delete returnedObject._id;
      delete returnedObject.__v;
    }
});

const User = mongoose.model('User', userSchema);

module.exports = User;