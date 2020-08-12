var mongoose = require('mongoose');

// schema
var comment3Schema = mongoose.Schema({
  post2:{type:mongoose.Schema.Types.ObjectId, ref:'post2', required:true},
  author:{type:mongoose.Schema.Types.ObjectId, ref:'user', required:true},
  parentComment3:{type:mongoose.Schema.Types.ObjectId, ref:'comment3'},
  text:{type:String, required:[true,'text is required!']},
  isDeleted:{type:Boolean},
  createdAt:{type:Date, default:Date.now},
  updatedAt:{type:Date},
},{
  toObject:{virtuals:true}
});

comment3Schema.virtual('childComments3')
  .get(function(){ return this._childComments3; })
  .set(function(value){ this._childComments3=value; });

// model & export
var Comment3 = mongoose.model('comment3',comment3Schema);
module.exports = Comment3;
