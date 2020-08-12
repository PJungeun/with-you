var mongoose = require('mongoose');
var Counter = require('./Counter');

// schema
var applySchema = mongoose.Schema({
  title:{type:String, required:[true,'Title is required!']},
  body:{type:String, required:[true,'Body is required!']},
  date:{type:Date, required:[true,'Date is required!']},
  time:{type:Number, required:[true,'Time is required!']},
  place:{type:String, required:[true,'Place is required!']},
  author:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  views:{type:Number, default:0},
  numId:{type:Number},
  createdAt:{type:Date, default:Date.now},
  updatedAt:{type:Date},
});

applySchema.pre('save', async function (next){
  var apply = this;
  if(apply.isNew){
    counter = await Counter.findOne({name:'applys'}).exec();
    if(!counter) counter = await Counter.create({name:'applys'});
    counter.count++;
    counter.save();
    apply.numId = counter.count;
  }
  return next();
});

// model & export
var Apply = mongoose.model('apply', applySchema);
module.exports = Apply;
