const express = require('express');
const router = express.Router();
const db = require('../db');
const nodemailer = require('nodemailer');

router.post('/mock-interviews', async (req, res) => {
  const { email, duration, topics, dates, cost, status } = req.body;

  const insertQuery = `
    INSERT INTO mock_interviews (email, duration, topics, dates, cost, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  db.query(insertQuery, [email, duration, JSON.stringify(topics), JSON.stringify(dates), cost, status], (err, result) => {
    if (err) {
      console.error("Error inserting mock interview:", err);
      return res.status(500).json({ message: "Failed to schedule mock interview" });
    }

    const topicsString = topics.map(topic => `roles LIKE '%${topic}%'`).join(' OR ');
    const mentorQuery = `SELECT * FROM mentor WHERE ${topicsString}`;

    db.query(mentorQuery, (err, mentors) => {
      if (err) {
        console.error("Error fetching mentors:", err);
        return res.status(500).json({ message: "Failed to fetch mentors" });
      }

      if (mentors.length === 0) {
        return res.status(404).json({ message: "No mentors available for the selected topics" });
      }

      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: {
          rejectUnauthorized: false, 
        },
      });

      mentors.forEach((mentor) => {
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: mentor.email,
          subject: `Mock Interview Request from ${email}`,
          text: `A student has requested a mock interview on the following topics: ${topics.join(', ')}. Available dates are: ${dates.join(', ')}. Duration: ${duration} minutes. Please respond to this request.`,
        };

        transporter.sendMail(mailOptions, (error, info) => {
          if (error) {
            console.error("Error sending email:", error);
          } else {
            console.log(`Email sent to ${mentor.email}: ${info.response}`);
          }
        });
      });

      res.status(201).json({ message: "Mock interview scheduled and requests sent to mentors" });
    });
  });
});

router.get('/requests/:mentorEmail', (req, res) => {
  const mentorEmail = req.params.mentorEmail;

  const query = `
    SELECT DISTINCT mi.id, mi.email, mi.duration, mi.topics, mi.dates, mi.status, s.name AS student_name
    FROM mock_interviews mi
    JOIN student s ON mi.email = s.email
    WHERE EXISTS (
      SELECT 1 
      FROM mentor m
      WHERE m.email = ?
      AND (mi.topics REGEXP REPLACE(m.roles, ',', '|'))
    )
    AND mi.status = 'In Progress'
  `;

  db.query(query, [mentorEmail], (err, results) => {
    if (err) {
      console.error('Error fetching data:', err);
      return res.status(500).json({ error: 'Failed to fetch data' });
    }
    console.log(results)
    res.json(results);
  });
});

router.post('/accept-request', (req, res) => {
  const { id, mock_date, mock_time, mentor_email } = req.body;

  const query = `UPDATE mock_interviews SET status = 'Accepted', mock_date = ?, mock_time = ?, mentor_email = ? WHERE id = ?`;
  
  db.query(query, [mock_date, mock_time, mentor_email, id], (err, result) => {
    if (err) {
      console.error('Error updating request:', err);
      res.status(500).json({ error: 'Failed to accept request' });
    } else {
      const fetchStudentQuery = `SELECT email FROM mock_interviews WHERE id = ?`;
      db.query(fetchStudentQuery, [id], (err, results) => {
        if (err) {
          console.error('Error fetching student email:', err);
          return res.status(500).json({ error: 'Failed to fetch student email' });
        }

        if (results.length > 0) {
          const studentEmail = results[0].email;

          const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            tls: {
              rejectUnauthorized: false, 
            },
          });

          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: studentEmail,
            subject: 'Mock Interview Scheduled',
            text: `Your mock interview has been scheduled by the mentor. 
            Date: ${mock_date}, Time: ${mock_time}.
            Please be prepared and join on time. Good luck!`,
          };

          transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
              console.error("Error sending email:", error);
            } else {
              console.log(`Email sent to student (${studentEmail}): ${info.response}`);
            }
          });
        }

        res.json({ message: 'Request accepted successfully and email sent to the student' });
      });
    }
  });
});


router.post('/reject-request', (req, res) => {
  const { id } = req.body;
  const query = `UPDATE mock_interviews SET status = 'Rejected' WHERE id = ?`;
  
  db.query(query, [id], (err, result) => {
    if (err) {
      console.error('Error updating request:', err);
      res.status(500).json({ error: 'Failed to reject request' });
    } else {
      res.json({ message: 'Request rejected successfully' });
    }
  });
});


router.get('/students/:email', (req, res) => {
  const { email } = req.params;

  const query = `
    SELECT 
      mi.id,
      mi.duration,
      mi.topics,
      mi.mock_date,
      mi.mock_time,
      mi.status,
      mi.student_score,
      m.Name as mentor_name
    FROM 
      mock_interviews mi
    LEFT JOIN 
      mentor m ON mi.mentor_email = m.email
    WHERE 
      mi.email = ?
  `;

  db.query(query, [email], (error, results) => {
    if (error) {
      console.error('Error fetching mock interviews:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
    res.json(results);
  });
});

router.put('/:id', (req, res) => {
  const interviewId = req.params.id;
  const { mentor_score } = req.body;

  if (typeof mentor_score !== 'number' || mentor_score < 0 || mentor_score > 10) {
    return res.status(400).json({ error: 'Invalid rating. It should be between 0 and 10.' });
  }

  const query = 'UPDATE mock_interviews SET mentor_score = ? WHERE id = ?';
  db.query(query, [mentor_score, interviewId], (err, result) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Rating updated successfully' });
  });
});

router.get('/:email', (req, res) => {
  const email = req.params.email;
  const query = `
    SELECT mi.id, mi.email AS student_email, mi.duration, mi.topics, mi.mock_date, mi.mock_time, mi.status, mi.student_score, mi.mentor_score, s.Name AS student_name
    FROM mock_interviews mi
    LEFT JOIN student s ON mi.email = s.email
    WHERE mi.mentor_email = ?
  `;
  db.query(query, [email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(results);
  });
});

router.put('/mentor/:id', (req, res) => {
  const id = req.params.id;
  const { student_score } = req.body;

  const query = `
    UPDATE mock_interviews
    SET student_score = ?
    WHERE id = ?
  `;

  db.query(query, [student_score, id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ message: 'Student score updated successfully' });
  });
});



module.exports = router;
