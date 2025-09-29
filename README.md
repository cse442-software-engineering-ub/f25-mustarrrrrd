# f25-mustarrrrrd
f25-mustarrrrrd created by GitHub Classroom

Team Members:
Ashish Behal, James Caporuscio, Sammy Ibrahim, Sumanyu Janapareddy, Brian Ren

Project Description:
Vision: Our vision is to develop an office hours web app which ease the process for students and professors in scheduling one on one help. During the dedicated time set aside 
for office hours, professors often times do not know who is waiting or for how long. The only way to know would be to get up and check, taking time away from helping students.
We hope to develop a solution that makes the signup process and live office hour experience smooth and easy, for both the student and professor. 

Statement: Our office hours solution will be a mobile and desktop web application that allows for students and professors to sign up as users. Students are able to filter 
office hours based on course or professor and they can sign up up to 24 hours before the office hour begins. Once signed up, they are added to a queue. Once the office hour
begins, the professor goes through students based on who signed up first. They can also view any notes the student may have added, so they can prepare for the office hour
if needed. The professor has a view of the live queue, and marks students as present or absent based on if they have shown up or not. The purpose of this is to hold an "accuracy" 
score so that professors are aware of which students may not be using the system responsibly. As the professor meets with students, they naviagte through the queue using "next" and
"previous" buttons. On the student side view, they are shown their position in the queue, and they receive a pop up notification once it is their turn. 

# How to Run App LOCALLY
1. Make sure XAMMP is properly running
2. Make sure that this repo is within the Apache local server
3. Make sure that you take the db.sample.php file and create a db.php file in /api (it will not be tracked by git). 
4. Go to http://localhost/phpmyadmin/
5. If you dont have it already, create new database: cse442_2025_fall_team_ai_db
5. Then, go into SQL tab
6. Go to doc/db_setup.sql and copy and paste that into the textbox and click Go
7. In your editor (or terminal), cd into /frontend, and run VITE_BASE=/f25-mustarrrrrd/app/ npm run build

