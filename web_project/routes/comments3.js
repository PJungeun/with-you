var express  = require('express');
var router = express.Router();
var Comment3 = require('../models/Comment3');
var Post2 = require('../models/Post2');
var util = require('../util');

// create
router.post('/', util.isLoggedin, checkPost2Id, function(req, res){
  var post2 = res.locals.post2;

  req.body.author = req.user._id;
  req.body.post2 = post2._id;

  Comment3.create(req.body, function(err, comment3){
    if(err){
      req.flash('comment3Form', { _id:null, form:req.body });
      req.flash('comment3Error', { _id:null, parentComment3:req.body.parentComment3, errors:util.parseError(err) });
    }
    return res.redirect('/posts2/'+post2._id+res.locals.getPost2QueryString());
  });
});

// update
router.put('/:id', util.isLoggedin, checkPermission, checkPost2Id, function(req, res){
  var post2 = res.locals.post2;

  req.body.updatedAt = Date.now();
  Comment3.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, comment3){
    if(err){
      req.flash('comment3Form', { _id:req.params.id, form:req.body });
      req.flash('comment3Error', { _id:req.params.id, parentComment3:req.body.parentComment3, errors:util.parseError(err) });
    }
    return res.redirect('/posts2/'+post2._id+res.locals.getPost2QueryString());
  });
});

// destroy
router.delete('/:id', util.isLoggedin, checkPermission, checkPost2Id, function(req, res){
  var post2 = res.locals.post2;

  Comment3.findOne({_id:req.params.id}, function(err, comment3){
    if(err) return res.json(err);

    // save updated comment3
    comment3.isDeleted = true;
    comment3.save(function(err, comment3){
      if(err) return res.json(err);

      return res.redirect('/posts2/'+post2._id+res.locals.getPost2QueryString());
    });
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Comment3.findOne({_id:req.params.id}, function(err, comment3){
    if(err) return res.json(err);
    if(comment3.author != req.user.id) return util.noPermission(req, res);

    next();
  });

}

function checkPost2Id(req, res, next){
  Post2.findOne({_id:req.query.post2Id}, function(err, post2){
    if(err) return res.json(err);

    res.locals.post2 = post2;
    next();
  });
}
