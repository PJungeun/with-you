var express  = require('express');
var router = express.Router();
var Post2 = require('../models/Post2');
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
  var posts2 = [];

  if(searchQuery) {
    var count = await Post2.countDocuments(searchQuery);
    maxPage = Math.ceil(count/limit);
    posts2 = await Post2.aggregate([
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
          foreignField: 'post2',
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
    posts2 = await Post2.find(searchQuery)
    .populate('author')
    .sort('-createdAt')
    .skip(skip)
    .limit(limit)
    .exec();
  }

  res.render('posts2/index', {
    posts2:posts2,
    currentPage:page,
    maxPage:maxPage,
    limit:limit,
    searchType:req.query.searchType,
    searchText:req.query.searchText
  });
});

// New
router.get('/new', util.isLoggedin, function(req, res){
  var post2 = req.flash('post2')[0] || {};
  var errors = req.flash('errors')[0] || {};
  res.render('posts2/new', { post2:post2, errors:errors });
});

// create
router.post('/', util.isLoggedin, function(req, res){
  req.body.author = req.user._id;
  Post2.create(req.body, function(err, post2){
    if(err){
      req.flash('post2', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/posts2/new'+res.locals.getPost2QueryString());
    }
    res.redirect('/posts2'+res.locals.getPost2QueryString(false, { page:1, searchText:'' }));
  });
});

// show
router.get('/:id', function(req, res){
  var comment3Form = req.flash('comment3Form')[0] || { _id: null, form: {} };
  var comment3Error = req.flash('comment3Error')[0] || { _id:null, parentComment3: null, errors:{} };

  Promise.all([
      Post2.findOne({_id:req.params.id}).populate({ path: 'author', select: 'username' }),
      Comment3.find({post2:req.params.id}).sort('createdAt').populate({ path: 'author', select: 'username' })
    ])
    .then(([post2, comments3]) => {
      post2.views++;
      post2.save();
      var comment3Trees = util.convertToTrees(comments3, '_id','parentComment3','childComments3');
      res.render('posts2/show', { post2:post2, comment3Trees:comment3Trees, comment3Form:comment3Form, comment3Error:comment3Error});
    })
    .catch((err) => {
      return res.json(err);
    });
});

// edit
router.get('/:id/edit', util.isLoggedin, checkPermission, function(req, res){
  var post2 = req.flash('post2')[0];
  var errors = req.flash('errors')[0] || {};
  if(!post2){
    Post2.findOne({_id:req.params.id}, function(err, post2){
        if(err) return res.json(err);
        res.render('posts2/edit', { post2:post2, errors:errors });
      });
  }
  else {
    post2._id = req.params.id;
    res.render('posts2/edit', { post2:post2, errors:errors });
  }
});

// update
router.put('/:id', util.isLoggedin, checkPermission, function(req, res){
  req.body.updatedAt = Date.now();
  Post2.findOneAndUpdate({_id:req.params.id}, req.body, {runValidators:true}, function(err, post2){
    if(err){
      req.flash('post2', req.body);
      req.flash('errors', util.parseError(err));
      return res.redirect('/posts2/'+req.params.id+'/edit'+res.locals.getPost2QueryString());
    }
    res.redirect('/posts2/'+req.params.id+res.locals.getPost2QueryString());
  });
});

// destroy
router.delete('/:id', util.isLoggedin, checkPermission, function(req, res){
  Post2.deleteOne({_id:req.params.id}, function(err){
    if(err) return res.json(err);
    res.redirect('/posts2'+res.locals.getPost2QueryString());
  });
});

module.exports = router;

// private functions
function checkPermission(req, res, next){
  Post2.findOne({_id:req.params.id}, function(err, post2){
    if(err) return res.json(err);
    if(post2.author != req.user.id) return util.noPermission(req, res);

    next();
  });
}

async function createSearchQuery(queries){
  var searchQuery = {};
  if(queries.searchType && queries.searchText && queries.searchText.length >= 3){
    var searchTypes = queries.searchType.toLowerCase().split(',');
    var post2Queries = [];
    if(searchTypes.indexOf('title')>=0){
      post2Queries.push({ title: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('body')>=0){
      post2Queries.push({ body: { $regex: new RegExp(queries.searchText, 'i') } });
    }
    if(searchTypes.indexOf('author!')>=0){
      var user = await User.findOne({ username: queries.searchText }).exec();
      if(user) post2Queries.push({author:user._id});
    }
    else if(searchTypes.indexOf('author')>=0){
      var users = await User.find({ username: { $regex: new RegExp(queries.searchText, 'i') } }).exec();
      var userIds = [];
      for(var user of users){
        userIds.push(user._id);
      }
      if(userIds.length>0) post2Queries.push({author:{$in:userIds}});
    }
    if(post2Queries.length>0) searchQuery = {$or:post2Queries};
    else searchQuery = null;
  }
  return searchQuery;
}
