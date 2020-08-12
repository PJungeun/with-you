var mongoose = require('mongoose');
var Counter = require('./Counter');

// schema
var post2Schema = mongoose.Schema({
  title:{type:String, required:[true,'Title is required!']},
  body:{type:String, required:[true,'Body is required!']},
  author:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  views:{type:Number, default:0},
  numId:{type:Number},
  createdAt:{type:Date, default:Date.now},
  updatedAt:{type:Date},
});

post2Schema.pre('save', async function (next){
  var post2 = this;
  if(post2.isNew){
    counter = await Counter.findOne({name:'posts2'}).exec();
    if(!counter) counter = await Counter.create({name:'posts2'});
    counter.count++;
    counter.save();
    post2.numId = counter.count;
  }
  return next();
});

// model & export
var Post2 = mongoose.model('post2', post2Schema);
module.exports = Post2;
