var express  = require('express');
var router = express.Router();
var Apply = require('../models/Apply');
var User = require('../models/User');
var Comment2 = require('../models/Comment2');
var util = require('../util');

// Index
router.get('/', async function(req, res){
  var page = Math.max(1, parseInt(req.query.page));
  var limit = Math.max(1, parseInt(req.query.limit));
  page = !isNaN(page)?page:1;
  limit = !isNaN(limit)?limit:10;

  var skip = (page-1)*limit;
  var maxPage = 0;
  var searchQuery = await createSearchQuery(req.query);
  var applys = [];

  if(searchQuery) {
    var count = await Apply.countDocuments(searchQuery);
    maxPage = Math.ceil(count/limit);
    applys = await Apply.aggregate([
      { $match: searchQuery },
      { $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
      } },
      { $unwind: '$author' },
      { $sort : { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      { $lookup: {
          from: 'comments2',
          localField: '_id',
          foreignField: 'apply',
          as: 'comments2'
      } },
      { $project: {
          title: 1,
          author: {
            username: 1,
          },
          views: 1,
          numId: 1,
          createdAt: 1,
          comment2Count: { $size: '$comments2'}
      } },
    ]).exec();
    applys = await Apply.find(searchQuery)
      .populate('author')
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .exec();
  }


  res.render('applys/index', {
    applys:applys,
    currentPage:page,
    maxPage:maxPage,
    limit:limit,
    searchType:req.query.searchType,
    searchText:req.query.searchText
  });
});

// New
router.get('/new', util.isLoggedin, function(req, res){
  var apply = req.flash('apply')[0] || {};
  var errors = req.flash('errors')[0] || {};
  res.render('applys/new', { apply:apply, errors:errors });
});

// create
router.post('/', util.isLoggedin, function(req, res){
  req.body.author = req.user._id;

  Apply.create(req.body, function(err, apply){ //db에 data를 생성하는 함수(생성할 data object 받고, 콜백함수 받기)
    if(err){
      req.flash('apply', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/applys/new'+res.locals.getApplyQueryString());
    }
    res.redirect('/applys'+res.locals.getApplyQueryString(false, { page:1, searchText:'' }));
  });
});

// show
router.get('/:id', function(req, res){
  var comment2Form = req.flash('comment2Form')[0] || { _id: null, form: {} };
  var comment2Error = req.flash('comment2Error')[0] || { _id:null, parentComment2: null, errors:{} };

  Promise.all([
      Apply.findOne({_id:req.params.id}).populate({ path: 'author', select: 'username' }),
      Comment2.find({apply:req.params.id}).sort('createdAt').populate({ path: 'author', select: 'username' })
    ])
    .then(([apply, comments2]) => {
      apply.views++;
      apply.save();
      var comment2Trees = util.convertToTrees(comments2, '_id','parentComment2','childComments2');
      res.render('applys/show', { apply:apply, comment2Trees:comment2Trees, comment2Form:comment2Form, comment2Error:comment2Error});
    })
    .catch((err) => {
      return res.json(err);
    });
});

// edit
router.get('/:id/edit', util.isLoggedin, checkPermission, function(req, res){
  var apply = req.flash('apply')[0];
  var errors = req.flash('errors')[0] || {};
  if(!apply){
    Apply.findOne({_id:req.params.id}, function(err, apply){
        if(err) return res.json(err);
        res.render('applys/edit', { apply:apply, errors:errors });
      });
  }
  else {
    apply._id = req.params.id;
    res.render('applys/edit', { apply:apply, errors:errors });
  }
});

// update
router.put('/:id', util.isLoggedin, checkPermission, function(req, res){
  req.body.updatedAt = Date.now();
  Apply.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, apply){
    if(err){
      req.flash('apply', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/applys/'+req.params.id+'/edit'+res.locals.getApplyQueryString());
    }
    res.redirect('/applys/'+req.params.id+res.locals.getApplyQueryString());
  });
});

// destroy
router.delete('/:id', util.isLoggedin, checkPermission, function(req, res){
  Apply.deleteOne({_id:req.params.id}, function(err){
    if(err) return res.json(err);
    res.redirect('/applys'+res.locals.getApplyQueryString());
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Apply.findOne({_id:req.params.id}, function(err, apply){
    if(err) return res.json(err);
    if(apply.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

async function createSearchQuery(queries){
  var searchQuery = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(',');
    var applyQueries = [];
    if(searchTypes.indexOf('title')>=0){
      applyQueries.push({ title: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('body')>=0){
      applyQueries.push({ body: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('author!')>=0){
      var user = await User.findOne({ username: queries.searchText }).exec();
      if(user) applyQueries.push({author:user._id});
    }
    else if(searchTypes.indexOf('author')>=0){
      var users = await User.find({ username: { $regex: new RegExp(queries.searchText, 'i') } }).exec();
      var userIds = [];
      for(var user of users){
        userIds.push(user._id);
      }
      if(userIds.length>0) applyQueries.push({author:{$in:userIds}});
    }
    if(applyQueries.length>0) searchQuery = {$or:applyQueries};
    else searchQuery = null;
  }
  return searchQuery;
}
