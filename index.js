require("dotenv").config();
const mysql = require("mysql");
const express = require("express");
const jwt = require('jsonwebtoken');
const cors = require('cors');
const app = express();
app.use(cors({
  origin: ["https://mock-interview-frontend.vercel.app"],
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials:true
}));
app.use(express.json());

const student = require("./Routes/Student");
const mentor = require("./Routes/Mentor");
const mockInterviewRoutes = require('./Routes/mockInterviews');
require('./db');
const db = require('./db');

app.use("/api/student", student);
app.use("/api/mentor", mentor);
app.use('/api', mockInterviewRoutes);

const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

app.get('/', (req, res) => {
    res.json({
        message: 'The API is working!'
    });
});

app.get('/protected-route', authenticateToken, (req, res) => {
  res.send('This is a protected route');
});

app.listen(8080, () => {
  console.log("Server is running");
});
