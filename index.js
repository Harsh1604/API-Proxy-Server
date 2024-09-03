const express = require('express')
const app = express()
const url = require('url')
require('dotenv').config()
const PORT = process.env.PORT || 5000
const needle = require('needle')
const rateLimit = require('express-rate-limit').default
const apicache = require ('apicache');
const cors = require('cors')

let cache = apicache.middleware;

let limiter = rateLimit({
    windowMs: process.env.RATE_LIMIT_WINDOW_MS || 1 * 60 * 1000, // milliseconds 10 minutes
    max: process.env.RATE_LIMIT_MAX || 5 
})

const formatDateInIST = (date) => {
    const options = {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    };

    return new Intl.DateTimeFormat('en-GB', options).format(date);
};

// Logging middleware
const logger = (req, res, next) => {
    const timestamp = formatDateInIST(new Date());
    const ip = req.ip;
    // const rateLimitStatus = res.getHeaders()['X-Ratelimit-Remaining']; // Get the remaining requests from rate limiter

    // console.log(`[${timestamp}] IP: ${ip}, Rate Limit Remaining: ${rateLimitStatus}`);

    res.on('finish', () => {
        const rateLimitRemaining = res.get('X-RateLimit-Remaining'); // Get the remaining requests from the response headers
        console.log(`[${timestamp}] IP: ${ip}, Rate Limit Remaining: ${rateLimitRemaining}`);
    });


    next();
};

app.use(cors())
app.use(limiter)
app.use(logger);

app.get('/' , (req,res) => {
    res.sendFile(__dirname + "/index.html")
    // res.send("hello")
})

const API_BASE_KEY = process.env.API_BASE_KEY
const API_BASE_URL = process.env.API_BASE_URL
const API_KEY_VALUE = process.env.API_KEY_VALUE

const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token === process.env.AUTH_TOKEN) {
            return next();
        }
    }
    res.status(403).json({ error: 'Forbidden: Invalid API Key' });
};


app.get('/getweather', authenticate , cache(process.env.CACHE_DURATION || '30 seconds'), async (req,res) => {
    try{
        const params = new URLSearchParams({
            [API_BASE_KEY]: API_KEY_VALUE,
            ...url.parse(req.url,true).query,
        });

        //make the get request using needle
        const apiRes = await needle("get",`${API_BASE_URL}?${params}`);

        console.log(apiRes.body)
        // res.send(apiRes)
        res.status(200).json({
            data : apiRes.body
        })

        console.log(params)

    }catch(error){
        console.error('Error fetching data from external API:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
})

app.listen(PORT, ()=> {
    console.log(`app is listening on PORT ${PORT}`)
})
