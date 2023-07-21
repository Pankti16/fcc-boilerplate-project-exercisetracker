const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

const mySecret = process.env['MONGO_DB_URL'];
//Variable to hold connection status
let isConnected = false;

//Connect to database
mongoose.connect(mySecret, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => isConnected = true);

app.use(cors())
app.use(express.static('public'))
// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));
// parse application/json
app.use(bodyParser.json());

//Mongodb stuff
const Schema = mongoose.Schema;
const Model = mongoose.model;
//User schema
const UserSchema = new Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  status: {
    type: Boolean,
    default: true,
  }
});
//Exercise schema
const ExerciseSchema = new Schema({
  user_id: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  status: {
    type: Boolean,
    default: true,
  }
});
//User model
const User = Model('User', UserSchema);
//Exercise model
const Exercise = Model('Exercise', ExerciseSchema);
//Get user by username
const findUserByUserName = (username, done) => {
  User.findOne({
    username,
    status: true
  },
  { status: 0, __v: 0 },
  function(err, data) {
    if (err) done(err, null);
    done(null, data);
  });
};
//Get user by user id
const findUserByUserId = (user_id, done) => {
  User.findOne({
    _id: user_id,
    status: true
  },
  { status: 0, __v: 0 },
  function(err, data) {
    if (err) done(err, null);
    done(null, data);
  });
};
//Get all users
const findAllUser = (done) => {
  User.find({
    status: true
  },
  { status: 0, __v: 0 },
  function(err, data) {
    if (err) done(err, null);
    done(null, data);
  });
};
//Insert new user
const addNewUser = (username, done) => {
  const _myUser = new User({
    username
  });
  _myUser.save(function(err, data) {
    if (err) done(err, null);
    done(null, data);
  });
};
//Get exercise by user id
const findExerciseByUserId = (user_id, from, to, limit, done) => {
  // date: { $gt: "2020-07-25", $lte: "2020-07-31" } yyyy-mm-dd
  let query = {
    user_id,
    status: true
  };
  if (from && to) {
    query.date = { $gt: from, $lte: to };
  }
  console.log(query, limit);
  const _myExercise = Exercise.find(query, { status: 0, __v: 0 }).limit(Math.max(-1, limit)).sort({ date: -1 });
  _myExercise.exec(function(err, data) {
    if (err) done(err, null);
    done(null, data);
  });
};
//Insert new exercise
const addNewExercise = (user_id, description, duration, date, done) => {
  const _myExercise = new Exercise({
    user_id,
    description,
    duration,
    date
  });
  _myExercise.save(function(err, data) {
    if (err) done(err, null);
    done(null, data);
  });
};

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

//Users api
app.route('/api/users')
  .get(function (req, res) {
    //Get all users
    //If db connected
    if (isConnected) {
      //Get all user db call
      findAllUser(function(allUserError, allUserData) {
        //If error return error
        if (allUserError) {
          console.log('allUserError', allUserError);
          return res.status(500).json({ error: 'Error getting data from the table!' });
        }
        //Else return data
        return res.status(200).json(allUserData);
      });
    } else {
      //If db not connected
      return res.status(500).json({ error: 'Error connecting to the database!' });
    }
  })
  .post(function(req, res) {
    //Add new user
    const {username} = req.body;
    //If user name passed
    if (username) {
      //If db connected
      if (isConnected) {
        //Check if user already exist then just return data instead of adding new
        findUserByUserName(username, function(unameError, unameData) {
          //If error getting user by name
          if (unameError) {
            console.log('unameError', unameError);
            return res.status(500).json({ error: 'Error checking user!' });
          }
          //If found user return it
          if (unameData) {
            return res.status(200).json(unameData);
          } else {
            //Else add new user to database
            addNewUser(username, function(addUnameError, addUnameData) {
              //If error adding to database
              if (addUnameError) {
                console.log('addUnameError', addUnameError);
                return res.status(500).json({ error: 'Error adding new user!' });
              }
              //Else return the newly added user
              if (addUnameData) {
                return res.status(200).json({_id: addUnameData?._id, username: addUnameData?.username});
              }
            });
          }
        });
      } else {
        //If db not connected
        return res.status(500).json({ error: 'Error connecting to the database!' });
      }
    } else {
      //Else return error
      return res.status(400).json({ error: 'User name is invalid!' });
    }
  });
//Get all logs for a user
app.get('/api/users/:user_id/logs', (req, res) => {
  const {user_id} = req.params;
  const {from, to, limit} = req.query;
  console.log(user_id, from, to, limit);
  const from_date = from ? new Date(from) : undefined;
  const to_date = to ? new Date(to) : undefined;
  let isError = false, errorMsg = '';
  //Check if from date is enter then it should be valid
  if (from && from_date === 'Invalid Date') {
    isError = true;
    errorMsg = 'Please enter valid from date(yyy-mm-dd)';
  }
  //Check if to date is enter then it should be valid
  if (to && to_date === 'Invalid Date') {
    isError = true;
    errorMsg = 'Please enter valid to date(yyy-mm-dd)';
  }
  console.log(from_date, to_date, from_date - to_date)
  //Check if from date is greater than to date
  if (from && to && from_date !== 'Invalid Date' && to_date !== 'Invalid Date' && from_date - to_date > 0) {
    isError = true;
    errorMsg = 'From date cannot be greater than to date';
  }
  //If no error proceed further
  if (!isError) {
    //If db connected
    if (isConnected) {
      //Check if user is there
      findUserByUserId(user_id, function(uidError, uidData) {
        //If error finding user by id
        if (uidError) {
          console.log('uidError', uidError);
          return res.status(500).json({ error: 'Error checking user!' });
        }
        //if found user
        if (uidData) {
          //Get all the exercise for user
          findExerciseByUserId(user_id, from_date, to_date, limit, function(getExError, getExData) {
            //If error getting user's exercises
            if (getExError) {
              console.log('getExError', getExError);
              return res.status(500).json({ error: 'Error getting exercises!' });
            }
            //Else return data
            return res.status(200).json({ 
              _id: user_id,
              username: uidData?.username,
              count: getExData.length, 
              log: getExData.map(function (e) {
                return {
                  description: e.description,
                  duration: e.duration,
                  date: new Date(e.date).toDateString()
                };
              }),
            });
          });
        } else {
          //else return error that no such user present
          return res.status(404).json({ error: 'No user found!' });
        }
      });
    } else {
      //If db not connected
      return res.status(500).json({ error: 'Error connecting to the database!' });
    }
  } else {
    //Else send error for invalid data
    return res.status(400).json({ error: errorMsg });
  }
});
//Add exrecise
app.post('/api/users/:user_id/exercises', (req, res) => {
  const {user_id} = req.params;
  const {description, duration} = req.body;
  //Get date from request body or take default one
  let date = req.body.date ?? new Date();
  const myRegExp = new RegExp(/\d{5,}/);
  //Convert date timestamp to valid number
  if (myRegExp.test(date)) {
    date = Number(date);
  }
  console.log(user_id, description, Number(duration), date, new Date(date), new Date(date).toDateString());
  //Create date object to insert into database
  const db_date = new Date(date);
  let isError = false, errorMsg = '';
  //Check if all inputs are correct or not
  //User id should be there
  if (!user_id) {
    isError = true;
    errorMsg = ':_id is missing!';
  }
  //Description should be there
  if (!description) {
    isError = true;
    errorMsg = 'Description is missing!';
  }
  //Duration should be a valid number
  if (!Number(duration) || Number(duration) < 0) {
    isError = true;
    errorMsg = 'Duration is missing or invalid!';
  }
  //Date should be valid
  if (!db_date || db_date === 'Invalid Date') {
    isError = true;
    errorMsg = 'Date is missing or invalid!';
  }
  //If no input error
  if (!isError) {
    //If db connected
    if (isConnected) {
      //Check if user is there
      findUserByUserId(user_id, function(uidError, uidData) {
        //If error getting user by id
        if (uidError) {
          console.log('uidError', uidError);
          return res.status(500).json({ error: 'Error checking user!' });
        }
        //If user found
        if (uidData) {
          //Insert the exercise record
          addNewExercise(user_id, description, Number(duration), db_date, function(addExError, addExData) {
            //If error inserting to database
            if (addExError) {
              console.log('addExError', addExError);
              return res.status(500).json({ error: 'Error adding exercise!' });
            }
            //else send new inserted exercise
            return res.status(200).json({ _id: user_id, username: uidData?.username, description, duration, date: db_date.toDateString() });
          });
        } else {
          //If user not found
          return res.status(404).json({ error: 'No user found!' });
        }
      });
    } else {
      //If db not connected
      return res.status(500).json({ error: 'Error connecting to the database!' });
    }
  } else {
    //Else send invalid input error
    return res.status(400).json({ error: errorMsg });
  }
});



const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
