var mongoose = require('mongoose');

// schema
var comment2Schema = mongoose.Schema({
  apply:{type:mongoose.Schema.Types.ObjectId, ref:'apply', required:true},
  author:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  parentComment2:{type:mongoose.Schema.Types.ObjectId, ref:'comment2'},
  text:{type:String, required:[true,'text is required!']},
  isDeleted:{type:Boolean},
  createdAt:{type:Date, default:Date.now},
  updatedAt:{type:Date},
},{
  toObject:{virtuals:true}
});

comment2Schema.virtual('childComments2')
  .get(function(){ return this._childComments2; })
  .set(function(value){ this._childComments2=value; });

// model & export
var Comment2 = mongoose.model('comment2',comment2Schema);
module.exports = Comment2;
