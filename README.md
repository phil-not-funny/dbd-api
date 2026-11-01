# Dead by Daylight API

This is not a official API by Behaviour nor the Dead by Daylight team.<br>
This API is made by scraping the official [Dead by Daylight wiki](https://deadbydaylight.wiki.gg) and formatting their HTML content into a nice JSON, which is then fed into a MongoDB.

## Description

Are you tired of outdated DBD APIs? Yeah, _me too_.<br>
So I decided to make my own but in a way that it will never get outdated.

This API runs on your machine using MongoDB and expressTS.<br>
On every start, it scrapes the **official** [Dead by Daylight Wiki](https://deadbydaylight.wiki.gg) and formats the data into a JSON structure that then gets fed into the MongoDB.

The idea of this was based on a similar approach used by another self-hosted API I found while searching. ([GitHub Repo](https://github.com/Techial/DBD-Database)).<br>
_(The problem was that their API scraped the outdated Fandom Wiki)_

## Getting Started

### Prerequisites

Your machine will need Node.js and MongoDB installed.<br>
You can find the installation instructions for Node.js [here](https://nodejs.org/en/download/) and for MongoDB [here](https://www.mongodb.com/docs/manual/installation/).

### Installation

After cloning the repository, you will need to install the dependencies using npm by running `npm install` in the root directory of the project.

Next, you will need a user, password and a database that the API will connect to.<br>

I found it's easiest to use the Desktop version of MongoDB - **MongoDB Compass**.
There you can simply create a new database with the click of a button. In shell mode you can create a new user with 

```js
db.createUser({ user: "username", pwd: "password" })
```

Make sure your user has read-write permissions on the database. More info [here](https://www.mongodb.com/docs/manual/core/security-users/).

### Environment

In the `.env.example` you can find the environment variables that need to be set for the API to work. Simply copy the file and rename it to `.env` and fill in your MongoDB credentials and URL.

You may also change the Port and Concurrency settings, but the default values should work fine.

### Starting

Nice, now just run `npm run start` to start the application.

## Endpoints

`/api/killers` - Returns all killers with their perks.<br>
`/api/survivors` - Returns all survivors with their perks.<br>

That's it for now, suckers. I will be adding more EPs and support for killer-power add-ons in the future.

---

Most errors should be self-explanatory, but if you have any issues, feel free to open an issue on GitHub.
Pull-requests are also welcomed.
