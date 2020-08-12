var express  = require('express');
var router = express.Router();
var Post3 = require('../models/Post3');
var User = require('../models/User');
var Comment3 = require('../models/Comment3');
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
  var posts3 = [];

  if(searchQuery) {
    var count = await Post3.countDocuments(searchQuery);
    maxPage = Math.ceil(count/limit);
    posts3 = await Post3.aggregate([
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
          from: 'comments3',
          localField: '_id',
          foreignField: 'post3',
          as: 'comments3'
      } },
      { $project: {
          title: 1,
          author: {
            username: 1,
          },
          views: 1,
          numId: 1,
          createdAt: 1,
          commentCount: { $size: '$comments3'}
      } },
    ]).exec();
    posts3 = await Post3.find(searchQuery)
    .populate('author')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .exec();
  }

  res.render('posts3/index', {
    posts3:posts3,
    currentPage:page,
    maxPage:maxPage,
    limit:limit,
    searchType:req.query.searchType,
    searchText:req.query.searchText
  });
});

// New
router.get('/new', util.isLoggedin, function(req, res){
  var post3 = req.flash('post3')[0] || {};
  var errors = req.flash('errors')[0] || {};
  res.render('posts3/new', { post3:post3, errors:errors });
});

// create
router.post('/', util.isLoggedin, function(req, res){
  req.body.author = req.user._id;
  Post3.create(req.body, function(err, post3){
    if(err){
      req.flash('post3', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/posts3/new'+res.locals.getPost3QueryString());
    }
    res.redirect('/posts3'+res.locals.getPost3QueryString(false, { page:1, searchText:'' }));
  });
});

// show
router.get('/:id', function(req, res){
  var comment3Form = req.flash('comment3Form')[0] || { _id: null, form: {} };
  var comment3Error = req.flash('comment3Error')[0] || { _id:null, parentComment3: null, errors:{} };

  Promise.all([
      Post3.findOne({_id:req.params.id}).populate({ path: 'author', select: 'username' }),
      Comment3.find({post3:req.params.id}).sort('createdAt').populate({ path: 'author', select: 'username' })
    ])
    .then(([post3, comments3]) => {
      post3.views++;
      post3.save();
      var comment3Trees = util.convertToTrees(comments3, '_id','parentComment3','childComments3');
      res.render('posts3/show', { post3:post3, comment3Trees:comment3Trees, comment3Form:comment3Form, comment3Error:comment3Error});
    })
    .catch((err) => {
      return res.json(err);
    });
});

// edit
router.get('/:id/edit', util.isLoggedin, checkPermission, function(req, res){
  var post3 = req.flash('post3')[0];
  var errors = req.flash('errors')[0] || {};
  if(!post3){
    Post3.findOne({_id:req.params.id}, function(err, post3){
        if(err) return res.json(err);
        res.render('posts3/edit', { post3:post3, errors:errors });
      });
  }
  else {
    post3._id = req.params.id;
    res.render('posts3/edit', { post3:post3, errors:errors });
  }
});

// update
router.put('/:id', util.isLoggedin, checkPermission, function(req, res){
  req.body.updatedAt = Date.now();
  Post3.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, post3){
    if(err){
      req.flash('post3', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/posts3/'+req.params.id+'/edit'+res.locals.getPost3QueryString());
    }
    res.redirect('/posts3/'+req.params.id+res.locals.getPost3QueryString());
  });
});

// destroy
router.delete('/:id', util.isLoggedin, checkPermission, function(req, res){
  Post3.deleteOne({_id:req.params.id}, function(err){
    if(err) return res.json(err);
    res.redirect('/posts3'+res.locals.getPost3QueryString());
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Post3.findOne({_id:req.params.id}, function(err, post3){
    if(err) return res.json(err);
    if(post3.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

async function createSearchQuery(queries){
  var searchQuery = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(',');
    var post3Queries = [];
    if(searchTypes.indexOf('title')>=0){
      post3Queries.push({ title: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('body')>=0){
      post3Queries.push({ body: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('author!')>=0){
      var user = await User.findOne({ username: queries.searchText }).exec();
      if(user) post3Queries.push({author:user._id});
    }
    else if(searchTypes.indexOf('author')>=0){
      var users = await User.find({ username: { $regex: new RegExp(queries.searchText, 'i') } }).exec();
      var userIds = [];
      for(var user of users){
        userIds.push(user._id);
      }
      if(userIds.length>0) post3Queries.push({author:{$in:userIds}});
    }
    if(post3Queries.length>0) searchQuery = {$or:post3Queries};
    else searchQuery = null;
  }
  return searchQuery;
}
