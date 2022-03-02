var express = require('express');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');//boay-parser module를 bodyParser변수에 담기
var app = express();
var methodOverride = require('method-override');//method-override module를 methodOverride변수에 담기
var flash = require('connect-flash');
var session = require('express-session');
var passport = require('./config/passport');//config/passport module를 passport 변수에 담기
var util = require('./util');


// DB setting
mongoose.set('useNewUrlParser', true);
mongoose.set('useFindAndModify', false);
mongoose.set('useCreateIndex', true);
mongoose.set('useUnifiedTopology', true);
mongoose.connect('mongodb://127.0.0.1:27017/dbname', {
    useUnifiedTopology: true,
    useNewUrlParser: true,
})
.then(() => console.log('DB Connected!')) //db연결 성공
.catch(err => {
     console.log('DB Connection Error: ' + err); //db연결 에러
});


// Other settings
app.set('view engine', 'ejs'); //ejs 사용을 위해 express의 view engine에 ejs를 set하는 코드
app.use(express.static(__dirname+'/public'));
app.use(bodyParser.json()); //json형식의 데이터를 받는다는 설정, form에 입력한 데이터가 bodyParser를 통해 req.body로 생성이 된다
app.use(bodyParser.urlencoded({extended:true})); //urlencoded data를 extended 알고리즘을 사용해서 분석한다는 설정
app.use(methodOverride('_method')); //_method의 query로 들어오는 값을 HTTP method로 바꿈
app.use(flash());//flash 초기화, 문자열 배열로 저장
app.use(session({secret:'MySecret', resave:true, saveUninitialized:true}));//서버에서 접속자 구분

// Passport
app.use(passport.initialize());//초기화
app.use(passport.session()); //연결

// Custom Middlewares
app.use(function(req,res,next){
  res.locals.isAuthenticated = req.isAuthenticated(); //로그인 여부 확인
  res.locals.currentUser = req.user; //로그인된 user의 정보
  next();
});

// Routes
app.use('/', require('./routes/home')); //app.use('route',콜백함수)
app.use('/posts', util.getPostQueryString, require('./routes/posts'));
app.use('/posts2', util.getPost2QueryString, require('./routes/posts2'));
app.use('/posts3', util.getPost3QueryString, require('./routes/posts3'));
app.use('/applys', util.getApplyQueryString, require('./routes/applys'));
app.use('/users', require('./routes/users'));
app.use('/comments', util.getPostQueryString, require('./routes/comments'));
app.use('/comments2', util.getApplyQueryString, require('./routes/comments2'));
app.use('/comments3', util.getPost2QueryString, require('./routes/comments3'));

// Port setting
var port = 3000;
app.listen(port, function(){
  console.log('server on! http://localhost:'+port);
});
