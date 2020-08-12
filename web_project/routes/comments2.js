var express  = require('express');
var router = express.Router();
var Comment2 = require('../models/Comment2');
var Apply = require('../models/Apply');
var util = require('../util');

// create
router.post('/', util.isLoggedin, checkApplyId, function(req, res){
  var apply = res.locals.apply;

  req.body.author = req.user._id;
  req.body.apply = apply._id;

  Comment2.create(req.body, function(err, comment2){
    if(err){
      req.flash('comment2Form', { _id:null, form:req.body });
      req.flash('comment2Error', { _id:null, parentComment2:req.body.parentComment2, errors:util.parseError(err) });
    }
    return res.redirect('/applys/'+apply._id+res.locals.getApplyQueryString());
  });
});

// update
router.put('/:id', util.isLoggedin, checkPermission, checkApplyId, function(req, res){
  var apply = res.locals.apply;

  req.body.updatedAt = Date.now();
  Comment2.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, comment2){
    if(err){
      req.flash('comment2Form', { _id:req.params.id, form:req.body });
      req.flash('comment2Error', { _id:req.params.id, parentComment2:req.body.parentComment2, errors:util.parseError(err) });
    }
    return res.redirect('/applys/'+apply._id+res.locals.getApplyQueryString());
  });
});

// destroy
router.delete('/:id', util.isLoggedin, checkPermission, checkApplyId, function(req, res){
  var apply = res.locals.apply;

  Comment2.findOne({_id:req.params.id}, function(err, comment2){
    if(err) return res.json(err);

    // save updated comment2
    comment2.isDeleted = true;
    comment2.save(function(err, comment2){
      if(err) return res.json(err);

      return res.redirect('/applys/'+apply._id+res.locals.getApplyQueryString());
    });
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Comment2.findOne({_id:req.params.id}, function(err, comment2){
    if(err) return res.json(err);
    if(comment2.author != req.user.id) return util.noPermission(req, res);

    next();
  });

}

function checkApplyId(req, res, next){
  Apply.findOne({_id:req.query.applyId}, function(err, apply){
    if(err) return res.json(err);

    res.locals.apply = apply;
    next();
  });
}
