var mongoose = require('mongoose');
var Counter = require('./Counter');

// schema
var post3Schema = mongoose.Schema({
  title:{type:String, required:[true,'Title is required!']},
  body:{type:String, required:[true,'Body is required!']},
  author:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  views:{type:Number, default:0},
  numId:{type:Number},
  createdAt:{type:Date, default:Date.now},
  updatedAt:{type:Date},
});

post3Schema.pre('save', async function (next){
  var post3 = this;
  if(post3.isNew){
    counter = await Counter.findOne({name:'posts3'}).exec();
    if(!counter) counter = await Counter.create({name:'posts3'});
    counter.count++;
    counter.save();
    post3.numId = counter.count;
  }
  return next();
});

// model & export
var Post3 = mongoose.model('post3', post3Schema);
module.exports = Post3;
