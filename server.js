var express = require('express');
var app = express();
var bodyParser = require('body-parser');
const fs = require('fs-extra');
const qs = require('qs');
var Promise = require('promise');
var rp = require('request-promise');
var beeminder = require('beeminder');
const util = require('util');

/* TODO */
//setup a cache of the json in .data and use that for testing(started)
//Rate limit.
//Clean up the silly promisification of the beeminder create datapoint
//ADD TESTS!
//Ask someone who knows Javascript if this is absolute garbage.
//Figure out if there is a better way to add non-promisey stuff to then chains than a dummy
//Cleanup index.html
//set up a mapping between slugs and languages and type

//var createDatapointAsync = util.promisify(beeminder.createDatapoint);

app.use(bodyParser.json()); // for parsing application/json

app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded

// http://expressjs.com/en/starter/static-files.html
app.use(express.static('public'));

// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  response.sendFile(__dirname + '/views/index.html');
});

var switchLanguage = function (shortlang) {
  console.log("Switching language to: " + shortlang);

  var options = {
    method: 'POST',
    jar: true,
    uri: 'https://www.duolingo.com/switch_language',
    formData: {'learning_language': shortlang}
  }


  return rp(options);
}

var loginDuolingo = function () {
  console.log("Logging in.");

  var options = {
    method: 'POST',
    jar: true,
    uri: 'https://www.duolingo.com/login',
    formData: {
      'login': process.env.DUOLINGO_USERNAME,
      'password': process.env.DUOLINGO_PASSWORD
    }
  }

  return rp(options);
}

var uploadGoldenSkills = function (shortlang, goalslug) {

  //TODO properly abstract out common code between the various upload*

  var fullyLearnedSkills, goldenSkills;
  var datapointValue, comment;

  var getJSON = loginDuolingo()
    .then(o => console.log("Logged in.  Switching languages."))
    .then(o => switchLanguage(shortlang))
    .then(response => JSON.parse(response))

  var getFullyLearnedSkills = getJSON
    .then(j => filterFullyLearnedSkills(j))
    .then(skills => skills.length)
    .then(count => fullyLearnedSkills = count)
    .catch(error => console.log(error));

  var getgoldenSkills = getJSON
    .then(response => filterGoldenSkills(response).length)
    .then(count => goldenSkills = count)
    .catch(error => console.log(error));

  getFullyLearnedSkills.then(o => console.log("Finished getting fully learned skills: " + fullyLearnedSkills))
  getgoldenSkills.then(o => console.log("Finished getting golden skills: " + goldenSkills))

  console.log("Logging into Beeminder")
  var bm = beeminder(process.env.BEEMINDER_AUTH_TOKEN);

  function createDatapointAsync(param, options) {
    return new Promise(function (resolve, reject) {
      bm.createDatapoint(param, options, function (err, data) {
        if (typeof something === "undefined" || err === null) {
          return resolve(data);
        } else {
          return reject(err);
        }
      });
    });
  }

  return Promise.all([getFullyLearnedSkills, getgoldenSkills])
    .then(values => {
      datapointValue = goldenSkills / fullyLearnedSkills;
      comment = goldenSkills + "/" + fullyLearnedSkills + " golden"
    })
    .then(o => {
      console.log("Datapoint Value: " + datapointValue)
      console.log("Comment: " + comment)
    })
    .then(o => createDatapointAsync(goalslug,
      {
        value: datapointValue,
        comment: comment
      }))
    .then(o => console.log('Done!'))
};

var uploadLearnedLessons = function (shortlang, goalslug) {

  var totalLessons, learnedLessons;
  var datapointValue, comment;

  var getJSON = loginDuolingo()
    .then(o => console.log("Logged in.  Switching languages."))
    .then(o => switchLanguage(shortlang))
    .then(response => JSON.parse(response))

  var getLearnedLessons = getJSON
    .then(j => countLearnedLessons(j))
    .then(count => learnedLessons = count)
    .catch(error => console.log(error))

  var getTotalLessons = getJSON
    .then(response => countTotalLessons(response))
    .then(count => totalLessons = count)
    .catch(error => console.log(error))

  getTotalLessons.then(o => console.log("Finished getting total lessons: " + totalLessons))
  getLearnedLessons.then(o => console.log("Finished getting learned lessons: " + learnedLessons))

  console.log("Logging into Beeminder")
  var bm = beeminder(process.env.BEEMINDER_AUTH_TOKEN);

  function createDatapointAsync(param, options) {
    return new Promise(function (resolve, reject) {
      bm.createDatapoint(param, options, function (err, data) {
        if (typeof something === "undefined" || err === null) {
          return resolve(data);
        } else {
          return reject(err);
        }
      });
    });
  }

  return Promise.all([getLearnedLessons, getTotalLessons])
    .then(values => {
      datapointValue = learnedLessons;
      comment = learnedLessons + "/" + totalLessons + " learned"
    })
    .then(o => {
      console.log("Datapoint Value: " + datapointValue)
      console.log("Comment: " + comment)
    })
    .then(o => createDatapointAsync(goalslug,
      {
        value: datapointValue,
        comment: comment
      }))
    .then(o => console.log('Done!'))
};

var uploadAverageStrength = function (shortlang, goalslug) {

  var totalStrength, learnedSkills, goldenSkills;
  var datapointValue, comment;

  var getJSON = loginDuolingo()
    .then(o => console.log("Logged in.  Switching languages."))
    .then(o => switchLanguage(shortlang))
    .then(response => JSON.parse(response))

  var getSumStrengthOfLearnedSkills = getJSON
    .then(j => strengthOfLearnedSkills(j))
    .then(strength => totalStrength = strength)
    .catch(error => console.log(error))
  
  var getGoldenSkills = getJSON
    .then(response => filterGoldenSkills(response).length)
    .then(count => goldenSkills = count)
    .catch(error => console.log(error));

  var getLearnedSkills = getJSON
    .then(response => filterFullyLearnedSkills(response).length)
    .then(count => learnedSkills = count)
    .catch(error => console.log(error))

  getSumStrengthOfLearnedSkills.then(o => console.log("Finished getting total strength: " + totalStrength))
  getLearnedSkills.then(o => console.log("Finished getting learned skills: " + learnedSkills))

  console.log("Logging into Beeminder")
  var bm = beeminder(process.env.BEEMINDER_AUTH_TOKEN);

  function createDatapointAsync(param, options) {
    return new Promise(function (resolve, reject) {
      bm.createDatapoint(param, options, function (err, data) {
        if (typeof something === "undefined" || err === null) {
          return resolve(data);
        } else {
          return reject(err);
        }
      });
    });
  }

  return Promise.all([getSumStrengthOfLearnedSkills, 
                      getLearnedSkills,
                      getGoldenSkills])
    .then(values => {
      datapointValue = totalStrength/learnedSkills;
      comment = goldenSkills + "/" + learnedSkills + " golden"
    })
    .then(o => {
      console.log("Datapoint Value: " + datapointValue)
      console.log("Comment: " + comment)
    })
    .then(o => createDatapointAsync(goalslug,
      {
        value: datapointValue,
        comment: comment
      }))
    .then(o => console.log('Done!'))
};

app.post("/update", function (request, response) {
  console.log("GOT AUTODATA REQUEST")
  console.log(request.body);
  if (request.body['username'] !== process.env.BEEMINDER_USERNAME) {
    console.log("Not for me!")
    response.sendStatus(403)
    return;
  }
  
  var goal;
  var slug = request.body['slug']
  
  if (slug == "duolingo_spanish_skills") {
    goal = uploadLearnedLessons('es', 'duolingo_spanish_skills') 
  } else if (slug == "duolingo_spanish_avg_strength") {
    goal = uploadAverageStrength('es', 'duolingo_spanish_avg_strength')
  } else if (slug == "duolingo_german_avg_strength") {
    goal = uploadAverageStrength('de', 'duolingo_german_avg_strength')
  } else if (slug == "duolingo_esperanto_avg_strength") {
    goal = uploadAverageStrength('eo', 'duolingo_esperanto_avg_strength')
  } else {
    console.log("Unknown slug: " + slug);
    response.sendStatus(403);
    return;
    }
  
  goal
    .then(o => console.log("Done updating goal."))
    .then(o => response.sendStatus(200))
});


app.post("/updateAll", function (request, response) {
  console.log(request.body);
  var duolingo_spanish_skills = uploadLearnedLessons('es', 'duolingo_spanish_skills') //i know this slug is named wrong, but it is too late to change it now!
  var duolingo_spanish_avg_strength = uploadAverageStrength('es', 'duolingo_spanish_avg_strength')
  var duolingo_german_avg_strength = uploadAverageStrength('de', 'duolingo_german_avg_strength')
  var duolingo_esperanto_avg_strength = uploadAverageStrength('eo', 'duolingo_esperanto_avg_strength')

  Promise.all([duolingo_spanish_skills,
    duolingo_spanish_avg_strength,
    duolingo_german_avg_strength,
    duolingo_esperanto_avg_strength])
    .then(o => console.log("Done."))
    .then(o => response.sendStatus(200))
    .catch(error => console.log("error: " + error));
});

//skills are made of lessons

var filterFullyLearnedSkills = function (d) {
  console.log("Getting fully learned skills");

  return d['skills']
    .filter(skill => skill['missing_lessons'] === 0)
}

var filterGoldenSkills = function (d) {
  console.log("Getting golden skills");

  return filterFullyLearnedSkills(d)
    .filter(skill => skill['strength'] == 1)
}

var strengthOfLearnedSkills = function (d) {
  console.log("Getting sum strength of learned skills");
  return filterFullyLearnedSkills(d)
    .reduce(function (sum, item) {
      return sum + item['strength'];
    }, 0)
}

var countTotalLessons = function (d) {
  console.log("Counting total lessons");
  return d['skills']
    .reduce(function (sum, item) {
      return sum + item['num_lessons'];
    }, 0)
}

var countLearnedLessons = function (d) {
  console.log("Counting learned lessons");
  return d['skills']
    .reduce(function (sum, item) {
      return sum + item['num_lessons'] - item['missing_lessons'];
    }, 0)
}

var listener = app.listen(process.env.PORT, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});