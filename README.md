# Full Stack Development Project

For this project you are tasked with developing a full stack web app for students to browse available courses and add manage their own course list. You will also be including a very basic (and incredibly insecure) authentication system to manage user accounts.

The project is split into two sections: the backend ExpressJS API server and the frontend web app it hosts. The server requirements come with automatic Jest test to help you focus on the functionality of the server without needing to mock out the frontend. Then it is up to you to design and develop the frontend to make use of your working API server (within the assignment requirements).

## Initial Setup

1. Make a copy of this template repo and clone your version to your computer
2. Open the cloned folder in VSCode and run `npm install` in your terminal to download the dependencies
3. Write all your backend code in `app.js`, the frontend files should all live in the `Public` folder
4. Run your server locally either by running `npm run serve` in the terminal, which will run `server.js` with nodemon. **The provided structure of app.js exporting the express app for server.js to actually use is important for the automated tests to work, please don't modify this**
5. Run the automated tests with either `npm run test` or with the `Jest Test Explorer` VSCode Extension

## Don't forget to commit and push frequently

## Requirements

- Backend code written in JavaScript using Node and Express which exposes the endpoints detailed below and tested by `server.test.js`
- "Database" made with basic JSON files in the `database` folder
- Frontend code using HTML, JavaScript, and/or CSS (or additional frontend tools like Svelte, Vue, Tailwind, etc) which queries and displays data from the server as well as 'posting', 'patching', or 'deleting' data as outlined below

### Server Requirements

- reference the tests for all status code requirements

#### get /courses

- respond with array of all course objects
- support query string to filter by code (eg `?code=TECH`), or by num (eg. `?num=1` for all 1XXX courses or `?num=1101` for any 1101 course)

#### get /account/:id

- respond with user object `{user: {username: ... , courses: [...], id: ...} }`
- if ID does’t exist, respond with error message `{error: ...}`

#### post /users/login

- body: username and password
- if username and password match a user, respond with `{userId: ...}`
- otherwise respond with error message `{error: ...}`

#### post /users/signup

- body: username and password
- if username not currently in use, add username and password with new ID to users database
- respond with `{userId: ...}`

#### patch /account/:id/courses/add

- body: course object
- if course object doesn't exist or doesn’t have code, title, and description, respond with error message
- if id doesn’t match a user, respond with error message
- if course was already in users course list, respond with error message
- otherwise add it, respond with updated course list

#### patch /account/:id/courses/remove

- body: course object
- if course object doesn't exist or doesn’t have code, title, and description, respond with error message
- if id doesn’t match a user, respond with error message
- if course was in users course list, remove it from the user's record in the database and respond with the updated course list

### Frontend

#### Home (index.html)

- requests /courses and displays them all
- ui to add filter params, rerequest /courses with query
- courses list shows course code, num, title and description
- if "logged in" (see below), course list items also have “Add” button
  - Add button sends patch request to /account/:id/courses/add with course object
  - If success, display success message
  - if unsuccessful, display error message
- Login/Logout Button
  - Login links to Login page
  - Logout removes user ID from session storage
- If Logged in, Account Button
  - links to Account page

#### Login (login.html)

- Username and password form, posts to /login
  - if response contains ID, store ID in session storage
  - if response ID is null, display error text
- link to Sign Up page

#### Sign Up (signup.html)

- username, password, & confirm password form
- on submit, first verify password and confirm password match and are not empty, then post to /signup
  - if response contains userId, store ID in session storage
  - if response userId is null, display error text
- link to Login Page

#### Account (account.html)

- If no ID in session storage, redirect to Home
- Otherwise, request account data from /account/:id (ID from session storage)
- Display username and user’s course list from response
- Course list items contain code, num, title, description, and “Remove” button
  - Remove button sends patch request to /account/:id/courses/remove with course object
  - Refresh list UI with updated list
