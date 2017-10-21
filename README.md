# Petition

## Summary
An app that collects signatures for a pledge.  Front end uses HTML5 Canvas and Handlebars.  Back end uses Express.js on Node.js with Redis for caching and Postgresql for persistent storage.

## Tech Stack
* Vanilla Javascript Front-end
* Express.js on Node.js
* Express-Handlebars
* Redis
* Postgresql 
* AWS S3 (for storing signature image data)


## Features

* Login and registration. Passwords hashed using the bcrypt library. 
* Users can save and edit basic profile information
* Users can use a a mouse or their finger (on mobile) to sign the pledge.  They have the option to delete their signature at any time. 
* Cookie-session data is stored in Redis
*
