require('dotenv').config();
var express = require('express')
var cors = require('cors')
var app = express()
const Mongoose = require('mongoose');
const User = require('./models/User.js');
const Place = require('./models/Place.js');
const Booking = require('./models/Booking.js');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const multer = require('multer')
const bcrypt = require("bcryptjs")
const fs = require('fs')
const imageDownloader = require('image-downloader')
const paths = require('path')


const jwtSecret = 'fasefraw4r5r3wq45wdfgw34twdfg';

app.use(cookieParser());
app.use(express.json())
app.use(express.urlencoded({extended:false}))
app.use('/uploads',express.static(__dirname+'/uploads'))
  app.use(cors())

Mongoose.connect(process.env.Mongooseurl)
.then(() => {
  console.log('MongoDB connected successfully');
})
.catch((err) => {
  console.error('MongoDB connection error', err);
});

function getUserDataFromReq(req) {
  return new Promise((resolve, reject) => {
    jwt.verify(req.cookies.token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      resolve(userData);
    });
  });
}


app.get('/',(req,res)=>{
    res.json("succes")
    
})

app.get('/test',(req,res)=>{

    res.json({succes:"true",massgae:"yess"})

})

app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
 
    try {
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const userdoc = await User.create({
            name: name,
            email: email,
            password: hashedPassword
        });

        res.json(userdoc);
    } catch (e) {
        console.error(e);
        res.status(442).json(e);
    }
});


app.get('/profile', (req,res) => {

    const {token} = req.cookies;
    if (token) {
      jwt.verify(token, jwtSecret, {}, async (err, userData) => {
        if (err) throw err;
        const {name,email,_id} = await User.findById(userData.id);
        res.json({name,email,_id});
      });
    } else {
      res.json(null);
    }
  });




app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userDoc = await User.findOne({ email });

        if (userDoc) {
            const passOk = bcrypt.compareSync(password, userDoc.password);


            if (passOk) {
                jwt.sign({
                    email: userDoc.email,
                    id: userDoc._id
                }, jwtSecret, {}, (err, token) => {
                    if (err) throw err;
                    res.cookie('token', token).json(userDoc);
                });
            } else {
                res.status(422).json('Password not okay');
            }
        } else {
            res.status(404).json('User not found');
        }
    } catch (e) {
        console.error(e);
        res.status(500).json('Internal Server Error');
    }
});


app.post('/logout',(req,res)=>{

    
    res.cookie('token','').json(true)

})
app.post('/upload-by-link', async(req,res)=>{
const {link}=req.body
const newName = 'photo' + Date.now() + '.jpg'
await imageDownloader.image({
    url:link,
    dest:__dirname+'/uploads/' +newName,
})

res.json(newName)

})
const photosMiddleware = multer({dest:'uploads/'});


app.post('/upload', photosMiddleware.array('photos', 100), async (req, res) => {
  const uploadedFiles = [];
  for (let i = 0; i < req.files.length; i++) {
    const { path, originalname } = req.files[i];
    const parts = originalname.split('.');
    const ext = parts[parts.length - 1];
    const newpath = path + '.' + ext;
    fs.renameSync(path, newpath);

    // Use string manipulation to get the filename
    const filename = paths.basename(newpath);
    uploadedFiles.push(filename);
  }
  res.json(uploadedFiles);
});


app.post('/places', (req,res) => {
 
    const {token} = req.cookies;
    const {
      title,address,addedPhotos,description,price,
      perks,extraInfo,checkIn,checkOut,maxGuests,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.create({
        owner:userData.id,price,
        title,address,photos:addedPhotos,description,
        perks,extraInfo,checkIn,checkOut,maxGuests,
      });
      res.json(placeDoc);
    });
  });


app.get('/places',(req,res)=>{
    const {token} = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      const {id} = userData;
      res.json( await Place.find({owner:id}) );
    });
})

app.get('/places/:id', async (req,res) => {
    const {id} = req.params;
    res.json(await Place.findById(id));
  });

app.get('/user-places', (req,res) => {
   
    const {token} = req.cookies;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      const {id} = userData;
      res.json( await Place.find({owner:id}) );
    });
  });


  app.put('/places', async (req,res) => {
 
    const {token} = req.cookies;
    const {
      id, title,address,addedPhotos,description,
      perks,extraInfo,checkIn,checkOut,maxGuests,price,
    } = req.body;
    jwt.verify(token, jwtSecret, {}, async (err, userData) => {
      if (err) throw err;
      const placeDoc = await Place.findById(id);
      if (userData.id === placeDoc.owner.toString()) {
        placeDoc.set({
          title,address,photos:addedPhotos,description,
          perks,extraInfo,checkIn,checkOut,maxGuests,price,
        });
        await placeDoc.save();
        res.json('ok');
      }
    });
  });

  app.post('/bookings', async (req, res) => {
   
    const userData = await getUserDataFromReq(req);
    const {
      place,checkIn,checkOut,numberOfGuests,name,phone,price,
    } = req.body;
    Booking.create({
      place,checkIn,checkOut,numberOfGuests,name,phone,price,
      user:userData.id,
    }).then((doc) => {
      res.json(doc);
    }).catch((err) => {
      throw err;
    });
  });
  
  
  
  app.get('/bookings', async (req,res) => {
   
    const userData = await getUserDataFromReq(req);
    res.json( await Booking.find({user:userData.id}).populate('place') );
  });


app.listen(process.env.PORT,()=>{
    console.log("server started at ", process.env.PORT);
})